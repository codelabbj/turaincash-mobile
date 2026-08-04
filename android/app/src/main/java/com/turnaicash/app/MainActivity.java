package com.turnaicash.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.net.Uri;
import android.webkit.WebResourceRequest;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int REQ_WEBVIEW_AUDIO = 9911;
    private PermissionRequest pendingWebPermissionRequest;

    // Flag to ensure we only set up the interface once
    private boolean webViewInterfaceSetup = false;
    
    // JavaScript interface to handle APK downloads
    public class WebAppInterface {
        @JavascriptInterface
        public void downloadApk(String url) {
            android.util.Log.d("MainActivity", "downloadApk called with URL: " + url);
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(url), "application/vnd.android.package-archive");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    
                    try {
                        startActivity(intent);
                        android.util.Log.d("MainActivity", "Intent started successfully");
                    } catch (android.content.ActivityNotFoundException e) {
                        android.util.Log.e("MainActivity", "No app to handle APK, trying chooser");
                        Intent chooser = Intent.createChooser(intent, "Download APK");
                        chooser.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(chooser);
                    }
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Error in downloadApk: " + e.getMessage(), e);
                }
            });
        }
    }
    
    private void openApkUrl(String url) {
        android.util.Log.d("MainActivity", "*** openApkUrl called with: " + url);
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
        } catch (android.content.ActivityNotFoundException e) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                Intent chooser = Intent.createChooser(intent, "Télécharger APK");
                chooser.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);
            } catch (Exception e2) {
                android.util.Log.e("MainActivity", "*** FAILED: Chooser also failed: " + e2.getMessage());
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "*** ERROR: Exception in openApkUrl: " + e.getMessage());
        }
    }
    
    private void setupWebViewInterface() {
        if (webViewInterfaceSetup) {
            return;
        }
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new WebAppInterface(), "AndroidDownloader");
            
            // Immediately test if interface is accessible
            webView.evaluateJavascript(
                "if (typeof AndroidDownloader !== 'undefined') { console.log('SUCCESS: AndroidDownloader is available!'); } else { console.error('ERROR: AndroidDownloader not found'); }",
                null
            );
            
            // Inject JavaScript that intercepts APK URL navigation
            String interceptScript = 
                "(function() {" +
                "  var originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');" +
                "  if (!originalLocationDescriptor || !originalLocationDescriptor.configurable) {" +
                "    console.log('Location property is not configurable, skipping interceptor');" +
                "    return;" +
                "  }" +
                "  Object.defineProperty(window, 'location', {" +
                "    configurable: true," +
                "    enumerable: true," +
                "    set: function(url) {" +
                "      if (url && url.endsWith('.apk')) {" +
                "        console.log('APK URL detected:', url);" +
                "        if (typeof AndroidDownloader !== 'undefined' && AndroidDownloader.downloadApk) {" +
                "          AndroidDownloader.downloadApk(url);" +
                "        } else {" +
                "          console.error('AndroidDownloader not available');" +
                "          window.postMessage({type: 'DOWNLOAD_APK', url: url}, '*');" +
                "        }" +
                "        return;" +
                "      }" +
                "      originalLocationDescriptor.set.call(window, url);" +
                "    }," +
                "    get: function() { return originalLocationDescriptor.get.call(window); }" +
                "  });" +
                "  console.log('APK URL interceptor installed');" +
                "})();";
            webView.evaluateJavascript(interceptScript, null);
            
            // Handle download events via DownloadListener without replacing Capacitor's BridgeWebViewClient
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    openApkUrl(url);
                }
            });
            
            webViewInterfaceSetup = true;
        }
    }

    private void attachWebViewMicHandler() {
        try {
            if (bridge == null) return;
            WebView webView = bridge.getWebView();
            if (webView == null) return;
            webView.setWebChromeClient(new BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> handleWebPermissionRequest(request));
                }
            });
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "attachWebViewMicHandler failed", e);
        }
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        boolean needsAudio = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                needsAudio = true;
                break;
            }
        }

        if (!needsAudio) {
            request.grant(request.getResources());
            return;
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED) {
            request.grant(request.getResources());
            return;
        }

        pendingWebPermissionRequest = request;
        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.RECORD_AUDIO},
                REQ_WEBVIEW_AUDIO
        );
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_WEBVIEW_AUDIO || pendingWebPermissionRequest == null) {
            return;
        }
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
        } else {
            pendingWebPermissionRequest.deny();
        }
        pendingWebPermissionRequest = null;
    }
    
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MicPermissionPlugin.class);
        super.onCreate(savedInstanceState);
        attachWebViewMicHandler();
    }
    
    @Override
    public void onStart() {
        super.onStart();
        attachWebViewMicHandler();
        setupWebViewInterface();
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(this::setupWebViewInterface, 500);
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(this::setupWebViewInterface, 2000);
    }
    
    @Override
    public void onResume() {
        super.onResume();
        attachWebViewMicHandler();
        setupWebViewInterface();
    }
}
