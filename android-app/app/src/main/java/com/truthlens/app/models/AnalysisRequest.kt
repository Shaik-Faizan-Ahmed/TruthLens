// Create: app/src/main/java/com/truthlens/app/models/AnalysisRequest.kt
package com.truthlens.app.models

data class AnalysisRequest(
    val content: String,
    val contentType: String = "text", // "text", "image", "url"
    val source: String = "manual"     // "manual", "share", "background"
)