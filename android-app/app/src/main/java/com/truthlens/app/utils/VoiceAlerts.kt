// Create: app/src/main/java/com/truthlens/app/utils/VoiceAlerts.kt
package com.truthlens.app.utils

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import java.util.*

/**
 * VoiceAlerts - Text-to-Speech functionality for elderly users
 *
 * This is a key accessibility feature for TruthLens, making it easier
 * for elderly users to understand warnings about misinformation
 */
class VoiceAlerts(private val context: Context) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "VoiceAlerts"
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false

    init {
        initializeTTS()
    }

    private fun initializeTTS() {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.let { textToSpeech ->
                val result = textToSpeech.setLanguage(Locale.US)

                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    Log.e(TAG, "Language not supported")
                    isInitialized = false
                } else {
                    // Configure for elderly-friendly speech
                    textToSpeech.setSpeechRate(0.8f)  // Slower speech
                    textToSpeech.setPitch(0.9f)       // Slightly lower pitch
                    isInitialized = true
                    Log.d(TAG, "TTS initialized successfully")
                }
            }
        } else {
            Log.e(TAG, "TTS initialization failed")
            isInitialized = false
        }
    }

    /**
     * Speak alert message for dangerous content
     */
    fun speakAlert(message: String) {
        if (!isInitialized) {
            Log.w(TAG, "TTS not initialized, cannot speak alert")
            return
        }

        tts?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "alert")
        Log.d(TAG, "Speaking alert: $message")
    }

    /**
     * Speak safety tip or explanation
     */
    fun speakTip(message: String) {
        if (!isInitialized) {
            Log.w(TAG, "TTS not initialized, cannot speak tip")
            return
        }

        tts?.speak(message, TextToSpeech.QUEUE_ADD, null, "tip")
        Log.d(TAG, "Speaking tip: $message")
    }

    /**
     * Quick safety alerts based on risk level
     */
    fun speakRiskLevelAlert(riskLevel: String) {
        val message = when (riskLevel.lowercase()) {
            "danger" -> "Warning! This message might be fake or a scam. Do not share your personal information or money."
            "caution" -> "Be careful. Please verify this information from trusted sources before acting."
            "safe" -> "This content appears to be safe."
            else -> "Analysis complete."
        }

        speakAlert(message)
    }

    /**
     * Speak detected scam patterns for education
     */
    fun speakDetectedPatterns(patterns: List<String>) {
        if (patterns.isEmpty()) return

        val message = buildString {
            append("Detected suspicious patterns: ")
            patterns.forEachIndexed { index, pattern ->
                append(pattern)
                if (index < patterns.size - 1) append(", ")
            }
            append(". Please be very careful.")
        }

        speakAlert(message)
    }

    /**
     * Emergency alert for high-risk scams
     */
    fun speakEmergencyAlert() {
        val message = "EMERGENCY ALERT: This appears to be a dangerous scam. " +
                "Do not share any personal information, OTP codes, or money. " +
                "Ask a trusted family member for help if needed."

        speakAlert(message)
    }

    /**
     * Educational tips for common scams
     */
    fun speakEducationalTip(tipType: String) {
        val message = when (tipType.lowercase()) {
            "otp" -> "Safety tip: Never share your OTP code with anyone. Banks and companies will never ask for OTP over phone or message."
            "lottery" -> "Safety tip: You cannot win a lottery you never entered. These are always scams asking for money or personal details."
            "investment" -> "Safety tip: Be very careful with investment offers. Always consult with trusted family or bank before investing money."
            "urgency" -> "Safety tip: Scammers create false urgency. Take time to verify important messages with trusted sources."
            "bank" -> "Safety tip: Banks will never ask for passwords, PINs, or OTPs through messages or calls. Always visit the bank directly."
            else -> "Safety tip: When in doubt, ask a trusted family member or friend before acting on suspicious messages."
        }

        speakTip(message)
    }

    /**
     * Stop all speech
     */
    fun stopSpeaking() {
        tts?.stop()
    }

    /**
     * Check if TTS is available and speaking
     */
    fun isSpeaking(): Boolean {
        return tts?.isSpeaking ?: false
    }

    /**
     * Release TTS resources
     */
    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
        Log.d(TAG, "VoiceAlerts shutdown")
    }
}