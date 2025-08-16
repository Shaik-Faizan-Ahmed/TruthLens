// Create: app/src/main/java/com/truthlens/app/activities/ShareVerifyActivity.kt
package com.truthlens.app.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.truthlens.app.R
import com.truthlens.app.services.ApiService
import com.truthlens.app.utils.VoiceAlerts
import kotlinx.coroutines.launch

/**
 * ShareVerifyActivity - Handles "Share to TruthLens" functionality
 *
 * This is the core feature that allows users to share content from any app
 * (WhatsApp, Facebook, News apps) directly to TruthLens for verification
 */
class ShareVerifyActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "ShareVerifyActivity"
    }

    private lateinit var apiService: ApiService
    private lateinit var voiceAlerts: VoiceAlerts

    // UI Components
    private lateinit var sharedContentText: TextView
    private lateinit var analysisStatusText: TextView
    private lateinit var analysisResultText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var backButton: Button
    private lateinit var shareAgainButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_share_verify)

        // Initialize services
        apiService = ApiService()
        voiceAlerts = VoiceAlerts(this)

        // Initialize UI
        initializeViews()
        setupClickListeners()

        // Handle the shared content
        handleSharedContent()
    }

    private fun initializeViews() {
        sharedContentText = findViewById(R.id.sharedContentText)
        analysisStatusText = findViewById(R.id.analysisStatusText)
        analysisResultText = findViewById(R.id.analysisResultText)
        progressBar = findViewById(R.id.progressBar)
        backButton = findViewById(R.id.backButton)
        shareAgainButton = findViewById(R.id.shareAgainButton)
    }

    private fun setupClickListeners() {
        backButton.setOnClickListener {
            finish()
        }

        shareAgainButton.setOnClickListener {
            val sharedContent = sharedContentText.text.toString()
            if (sharedContent.isNotEmpty()) {
                analyzeSharedContent(sharedContent)
            }
        }
    }

    /**
     * Handle content shared from other apps
     * Supports text sharing from WhatsApp, Facebook, etc.
     */
    private fun handleSharedContent() {
        when (intent?.action) {
            Intent.ACTION_SEND -> {
                if ("text/plain" == intent.type) {
                    handleTextShare()
                } else if (intent.type?.startsWith("image/") == true) {
                    handleImageShare()
                }
            }
            else -> {
                showError("No content shared")
                return
            }
        }
    }

    private fun handleTextShare() {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)

        if (sharedText.isNullOrEmpty()) {
            showError("No text content found")
            return
        }

        Log.d(TAG, "Received shared text: ${sharedText.take(100)}...")

        // Display shared content
        sharedContentText.text = sharedText

        // Automatically analyze the shared content
        analyzeSharedContent(sharedText)
    }

    private fun handleImageShare() {
        // For now, show message about image support
        sharedContentText.text = "📸 Image shared"
        analysisStatusText.text = "🔄 Image analysis not yet implemented"
        analysisResultText.text = "Image analysis feature will be available in the next update. For now, please share text content."

        Toast.makeText(this, "Image analysis coming soon!", Toast.LENGTH_LONG).show()
    }

    /**
     * Analyze the shared content using TruthLens backend
     */
    private fun analyzeSharedContent(content: String) {
        showProgress(true)
        analysisStatusText.text = "🔍 Analyzing shared content..."
        analysisResultText.text = ""

        lifecycleScope.launch {
            try {
                val result = apiService.analyzeContent(
                    content = content,
                    contentType = "text",
                    source = "share"
                )

                showProgress(false)

                // Update UI based on risk level
                val (statusColor, statusIcon) = when (result.riskLevel) {
                    "safe" -> Pair(Color.parseColor("#4CAF50"), "✅")
                    "caution" -> Pair(Color.parseColor("#FF9800"), "⚠️")
                    "danger" -> Pair(Color.parseColor("#F44336"), "🚨")
                    else -> Pair(Color.parseColor("#9E9E9E"), "❓")
                }

                analysisStatusText.apply {
                    text = "$statusIcon Analysis Complete - ${result.riskLevel.uppercase()}"
                    setTextColor(statusColor)
                }

                // Show detailed results
                analysisResultText.text = buildString {
                    append("🎯 Confidence: ${(result.confidence * 100).toInt()}%\n\n")

                    if (result.detectedPatterns.isNotEmpty()) {
                        append("⚠️ Detected Patterns:\n")
                        result.detectedPatterns.forEach { pattern ->
                            append("• $pattern\n")
                        }
                        append("\n")
                    }

                    if (result.explanation.isNotEmpty()) {
                        append("📋 Analysis:\n")
                        append(result.explanation)
                        append("\n\n")
                    }

                    when (result.riskLevel) {
                        "safe" -> append("✅ This content appears to be legitimate and safe.")
                        "caution" -> append("⚠️ Please verify this information from other sources before acting on it.")
                        "danger" -> append("🚨 This appears to be misinformation or a scam. Do not act on this information.")
                    }
                }

                // Voice alert for high-risk content
                if (result.riskLevel == "danger") {
                    voiceAlerts.speakAlert("Warning: This message appears to be fake or a scam. Please do not act on it.")
                } else if (result.riskLevel == "caution") {
                    voiceAlerts.speakAlert("Caution: Please verify this information before acting on it.")
                }

                Log.d(TAG, "Share verification complete: ${result.riskLevel}")

            } catch (e: Exception) {
                showProgress(false)
                showError("Analysis failed: ${e.message}")
                Log.e(TAG, "Share analysis failed", e)
            }
        }
    }

    private fun showProgress(show: Boolean) {
        progressBar.isVisible = show
        shareAgainButton.isEnabled = !show
    }

    private fun showError(message: String) {
        showProgress(false)
        analysisStatusText.apply {
            text = "❌ Error"
            setTextColor(Color.parseColor("#F44336"))
        }
        analysisResultText.text = message
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}