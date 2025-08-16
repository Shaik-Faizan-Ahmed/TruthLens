package com.truthlens.app

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.truthlens.app.services.ApiService
import com.truthlens.app.services.ScreenMonitorService
import com.truthlens.app.utils.VoiceAlerts
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var apiService: ApiService
    private lateinit var voiceAlerts: VoiceAlerts

    // UI Components
    private lateinit var contentInput: EditText
    private lateinit var verifyButton: Button
    private lateinit var statusText: TextView
    private lateinit var resultText: TextView
    private lateinit var enableAccessibilityButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize services
        apiService = ApiService()
        voiceAlerts = VoiceAlerts(this)

        // Initialize UI
        initializeViews()
        setupClickListeners()

        // Check backend connection
        checkBackendConnection()

        // Check accessibility service status
        updateAccessibilityStatus()
    }

    private fun initializeViews() {
        contentInput = findViewById(R.id.contentInput)
        verifyButton = findViewById(R.id.verifyButton)
        statusText = findViewById(R.id.statusText)
        resultText = findViewById(R.id.resultText)
        enableAccessibilityButton = findViewById(R.id.enableAccessibilityButton)
    }

    private fun setupClickListeners() {
        verifyButton.setOnClickListener {
            val content = contentInput.text.toString().trim()
            if (content.isNotEmpty()) {
                verifyContent(content)
            } else {
                Toast.makeText(this, "Please enter some content to verify", Toast.LENGTH_SHORT).show()
            }
        }

        enableAccessibilityButton.setOnClickListener {
            openAccessibilitySettings()
        }
    }

    private fun verifyContent(content: String) {
        statusText.text = "Analyzing content..."
        resultText.text = ""

        lifecycleScope.launch {
            try {
                val result = apiService.analyzeContent(content)

                // Update UI with results
                statusText.text = when (result.riskLevel) {
                    "safe" -> "✅ Content appears safe"
                    "caution" -> "⚠️ Caution: Verify before acting"
                    "danger" -> "🚨 Warning: Likely misinformation"
                    else -> "Analysis complete"
                }

                resultText.text = buildString {
                    append("Risk Level: ${result.riskLevel.uppercase()}\n")
                    append("Confidence: ${(result.confidence * 100).toInt()}%\n\n")

                    if (result.detectedPatterns.isNotEmpty()) {
                        append("Detected Issues:\n")
                        result.detectedPatterns.forEach { pattern ->
                            append("• $pattern\n")
                        }
                        append("\n")
                    }

                    if (result.explanation.isNotEmpty()) {
                        append("Why this might be concerning:\n")
                        append(result.explanation)
                    }
                }

                // Voice alert for elderly users
                if (result.riskLevel != "safe") {
                    voiceAlerts.speakAlert("Warning: This message might be fake. Please verify before acting.")
                }

            } catch (e: Exception) {
                statusText.text = "❌ Analysis failed"
                resultText.text = "Error: ${e.message}"
                Toast.makeText(this@MainActivity, "Failed to analyze content", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun checkBackendConnection() {
        lifecycleScope.launch {
            try {
                val isConnected = apiService.checkHealth()
                statusText.text = if (isConnected) {
                    "🟢 Backend Connected"
                } else {
                    "🔴 Backend Disconnected"
                }
            } catch (e: Exception) {
                statusText.text = "🔴 Backend Disconnected - ${e.message}"
            }
        }
    }

    private fun updateAccessibilityStatus() {
        val isEnabled = ScreenMonitorService.isAccessibilityServiceEnabled(this)
        enableAccessibilityButton.text = if (isEnabled) {
            "✅ Background Monitoring Active"
        } else {
            "Enable Background Monitoring"
        }
        enableAccessibilityButton.isEnabled = !isEnabled
    }

    private fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(
            this,
            "Please enable TruthLens in Accessibility settings",
            Toast.LENGTH_LONG
        ).show()
    }

    override fun onResume() {
        super.onResume()
        updateAccessibilityStatus()
    }

    override fun onDestroy() {
        super.onDestroy()
        voiceAlerts.shutdown()
    }
}