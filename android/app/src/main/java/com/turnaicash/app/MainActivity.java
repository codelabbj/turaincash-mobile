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
            
            WebViewClient originalClient = webView.getWebViewClient();
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (url != null && url.endsWith(".apk")) {
                        view.stopLoading();
                        MainActivity.this.runOnUiThread(() -> openApkUrl(url));
                        return true;
                    }
                    if (originalClient != null) {
                        return originalClient.shouldOverrideUrlLoading(view, request);
                    }
                    return false;
                }
                
                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    if (url != null && (url.endsWith(".apk") || url.contains(".apk"))) {
                        view.stopLoading();
                        openApkUrl(url);
                        return;
                    }
                    if (originalClient != null) {
                        originalClient.onPageStarted(view, url, favicon);
                    }
                }
                
                @Override
                public void onLoadResource(WebView view, String url) {
                    if (url != null && url.endsWith(".apk")) {
                        view.stopLoading();
                        MainActivity.this.runOnUiThread(() -> openApkUrl(url));
                        return;
                    }
                    if (originalClient != null) {
                        originalClient.onLoadResource(view, url);
                    }
                }
                
                @Override
                public void onPageFinished(WebView view, String url) {
                    view.addJavascriptInterface(new WebAppInterface(), "AndroidDownloader");
                    String downloadScript =
                        "window.downloadApk = function(url) {" +
                        "  if (typeof AndroidDownloader !== 'undefined' && AndroidDownloader.downloadApk) {" +
                        "    AndroidDownloader.downloadApk(url);" +
                        "  } else { window.location.href = url; }" +
                        "};";
                    view.evaluateJavascript(downloadScript, null);
                    if (originalClient != null) {
                        originalClient.onPageFinished(view, url);
                    }
                }
            });
            
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
