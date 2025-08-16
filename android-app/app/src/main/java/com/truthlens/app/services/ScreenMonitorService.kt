// Create: app/src/main/java/com/truthlens/app/services/ScreenMonitorService.kt
package com.truthlens.app.services

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.lifecycle.lifecycleScope
import com.truthlens.app.utils.VoiceAlerts
import kotlinx.coroutines.*

/**
 * ScreenMonitorService - Background monitoring using Accessibility Service
 *
 * This service monitors content in WhatsApp, Facebook, and other apps
 * for real-time misinformation detection - core TruthLens feature
 */
class ScreenMonitorService : AccessibilityService() {

    companion object {
        private const val TAG = "ScreenMonitorService"

        // Apps to monitor
        private val MONITORED_APPS = setOf(
            "com.whatsapp",
            "com.facebook.katana",
            "com.instagram.android",
            "com.twitter.android",
            "com.android.chrome",
            "com.android.browser"
        )

        /**
         * Check if accessibility service is enabled
         */
        fun isAccessibilityServiceEnabled(context: Context): Boolean {
            val accessibilityServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )

            return accessibilityServices?.contains("com.truthlens.app/.services.ScreenMonitorService") == true
        }
    }

    private lateinit var apiService: ApiService
    private lateinit var voiceAlerts: VoiceAlerts
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Rate limiting to prevent excessive API calls
    private var lastAnalysisTime = 0L
    private var lastAnalyzedText = ""
    private val analysisInterval = 3000L // 3 seconds minimum between analyses

    override fun onServiceConnected() {
        super.onServiceConnected()

        apiService = ApiService()
        voiceAlerts = VoiceAlerts(this)

        Log.i(TAG, "🔍 TruthLens background monitoring started")

        // Test backend connection
        serviceScope.launch {
            try {
                val isConnected = apiService.checkHealth()
                Log.i(TAG, "Backend connection: ${if (isConnected) "✅ Connected" else "❌ Disconnected"}")
            } catch (e: Exception) {
                Log.w(TAG, "Backend check failed: ${e.message}")
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return

        // Only monitor specific apps
        val packageName = event.packageName?.toString() ?: return
        if (packageName !in MONITORED_APPS) return

        // Only process text changes and window content changes
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                processAccessibilityEvent(event)
            }
        }
    }

    private fun processAccessibilityEvent(event: AccessibilityEvent) {
        // Rate limiting
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastAnalysisTime < analysisInterval) return

        val rootNode = rootInActiveWindow ?: return
        val extractedText = extractTextFromScreen(rootNode)

        // Skip if no meaningful text or same as last analysis
        if (extractedText.length < 20 || extractedText == lastAnalyzedText) return

        lastAnalysisTime = currentTime
        lastAnalyzedText = extractedText

        val packageName = event.packageName?.toString() ?: "unknown"
        Log.d(TAG, "Analyzing text from $packageName: ${extractedText.take(50)}...")

        // Analyze in background
        serviceScope.launch {
            try {
                val result = apiService.analyzeContent(
                    content = extractedText,
                    contentType = "text",
                    source = "background_$packageName"
                )

                // Only alert for high-risk content to avoid notification fatigue
                if (result.riskLevel == "danger" && result.confidence > 0.7) {
                    Log.w(TAG, "⚠️ High-risk content detected: ${result.detectedPatterns}")

                    // Voice alert for dangerous content
                    withContext(Dispatchers.Main) {
                        voiceAlerts.speakEmergencyAlert()

                        // Could add notification here if needed
                        // showRiskNotification(result)
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "Background analysis failed: ${e.message}")
            }
        }
    }

    /**
     * Extract text content from the current screen
     */
    private fun extractTextFromScreen(node: AccessibilityNodeInfo): String {
        val textBuilder = StringBuilder()

        extractTextRecursively(node, textBuilder)

        return textBuilder.toString().trim()
    }

    private fun extractTextRecursively(node: AccessibilityNodeInfo?, textBuilder: StringBuilder) {
        node ?: return

        // Extract text from current node
        val nodeText = node.text?.toString()
        if (!nodeText.isNullOrEmpty() && nodeText.length > 3) {
            // Filter out UI elements and focus on message content
            if (isContentText(nodeText)) {
                textBuilder.append(nodeText).append(" ")
            }
        }

        // Recursively process child nodes
        for (i in 0 until node.childCount) {
            extractTextRecursively(node.getChild(i), textBuilder)
        }

        node.recycle()
    }

    /**
     * Determine if text is likely to be content (not UI elements)
     */
    private fun isContentText(text: String): Boolean {
        val lowerText = text.lowercase().trim()

        // Skip common UI elements
        val uiElements = setOf(
            "type a message", "search", "send", "camera", "attach",
            "call", "video call", "online", "last seen", "typing",
            "delivered", "read", "today", "yesterday", "menu"
        )

        if (uiElements.any { lowerText.contains(it) }) return false

        // Skip very short text
        if (text.length < 10) return false

        // Skip text that's mostly numbers or symbols
        val alphaCount = text.count { it.isLetter() }
        if (alphaCount < text.length * 0.3) return false

        return true
    }

    /**
     * Quick pre-filtering to identify potentially risky content
     * This reduces API calls by doing basic keyword detection locally
     */
    private fun containsSuspiciousKeywords(text: String): Boolean {
        val lowerText = text.lowercase()
        val suspiciousKeywords = setOf(
            "otp", "verify account", "urgent", "lottery", "won prize",
            "investment opportunity", "click immediately", "limited time",
            "bank account blocked", "suspicious activity", "confirm details",
            "prize money", "congratulations you have won", "claim reward",
            "send money", "transfer amount", "share this message"
        )

        return suspiciousKeywords.any { lowerText.contains(it) }
    }

    override fun onInterrupt() {
        Log.i(TAG, "🔍 TruthLens monitoring interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        voiceAlerts.shutdown()
        Log.i(TAG, "🔍 TruthLens monitoring stopped")
    }
}