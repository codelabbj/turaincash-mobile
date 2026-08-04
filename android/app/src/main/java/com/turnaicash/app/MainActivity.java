package com.turnaicash.app;

import android.webkit.DownloadListener;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.net.Uri;
import android.content.Intent;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Flag to ensure we only set up the interface once
    private boolean webViewInterfaceSetup = false;
    
    // JavaScript interface to handle APK downloads
    public class WebAppInterface {
        @JavascriptInterface
        public void downloadApk(String url) {
            android.util.Log.d("MainActivity", "downloadApk called with URL: " + url);
            runOnUiThread(() -> {
                try {
                    // Use ACTION_VIEW with explicit MIME type for APK
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(url), "application/vnd.android.package-archive");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    
                    // Try to start the intent
                    try {
                        startActivity(intent);
                        android.util.Log.d("MainActivity", "Intent started successfully");
                    } catch (android.content.ActivityNotFoundException e) {
                        android.util.Log.e("MainActivity", "No app to handle APK, trying chooser");
                        // If no app handles it directly, use chooser
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
        android.util.Log.d("MainActivity", "*** Thread: " + Thread.currentThread().getName());
        
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            android.util.Log.d("MainActivity", "*** Intent created, attempting to start activity");
            
            startActivity(intent);
            android.util.Log.d("MainActivity", "*** SUCCESS: Intent started successfully!");
        } catch (android.content.ActivityNotFoundException e) {
            android.util.Log.e("MainActivity", "*** ActivityNotFoundException: " + e.getMessage());
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                Intent chooser = Intent.createChooser(intent, "Télécharger APK");
                chooser.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);
                android.util.Log.d("MainActivity", "*** Chooser started as fallback");
            } catch (Exception e2) {
                android.util.Log.e("MainActivity", "*** FAILED: Chooser also failed: " + e2.getMessage());
                e2.printStackTrace();
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "*** ERROR: Exception in openApkUrl: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private void setupWebViewInterface() {
        // Only run once
        if (webViewInterfaceSetup) {
            return;
        }
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            android.util.Log.d("MainActivity", "Setting up WebView interface, WebView is available");
            // Add JavaScript interface
            webView.getSettings().setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new WebAppInterface(), "AndroidDownloader");
            android.util.Log.d("MainActivity", "JavaScript interface 'AndroidDownloader' added to WebView");
            
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
                    android.util.Log.d("MainActivity", "onDownloadStart called with URL: " + url);
                    openApkUrl(url);
                }
            });
            
            // Mark as setup
            webViewInterfaceSetup = true;
        } else {
            android.util.Log.w("MainActivity", "WebView is null, cannot setup interface");
        }
    }
    
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // Try setting up immediately, then also retry after delay
        setupWebViewInterface();
        
        // Also retry after delays in case WebView wasn't ready
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            setupWebViewInterface();
        }, 500);
        
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            setupWebViewInterface();
        }, 2000);
    }
    
    @Override
    public void onResume() {
        super.onResume();
        setupWebViewInterface();
    }
}
