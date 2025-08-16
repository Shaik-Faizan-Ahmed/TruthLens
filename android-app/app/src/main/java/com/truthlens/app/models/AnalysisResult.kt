// Create: app/src/main/java/com/truthlens/app/models/AnalysisResult.kt
package com.truthlens.app.models

import com.google.gson.annotations.SerializedName

data class AnalysisResult(
    @SerializedName("risk_level")
    val riskLevel: String,           // "safe", "caution", "danger"

    val confidence: Double,          // 0.0 to 1.0

    @SerializedName("detected_patterns")
    val detectedPatterns: List<String>, // ["OTP scam", "Investment fraud", etc.]

    val explanation: String,         // Why it's risky

    @SerializedName("ui_indicators")
    val uiIndicators: UIIndicators,

    val timestamp: String = ""
)

data class UIIndicators(
    @SerializedName("traffic_light")
    val trafficLight: String,       // "green", "yellow", "red"

    val icon: String,               // "✅", "⚠️", "🚨"

    @SerializedName("confidence_bar")
    val confidenceBar: Int,         // 0-100 percentage

    @SerializedName("voice_alert")
    val voiceAlert: String          // Message for TTS
)
