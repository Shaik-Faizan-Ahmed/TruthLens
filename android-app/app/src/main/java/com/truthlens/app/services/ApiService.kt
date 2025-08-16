// Create: app/src/main/java/com/truthlens/app/services/ApiService.kt
package com.truthlens.app.services

import android.util.Log
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.truthlens.app.models.AnalysisRequest
import com.truthlens.app.models.AnalysisResult
import com.truthlens.app.models.UIIndicators
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiService {
    private val client: OkHttpClient
    private val gson: Gson

    companion object {
        private const val TAG = "ApiService"

        // Backend URL - Update this to match your Docker setup
        // In ApiService.kt, change:
        private const val BASE_URL = "http://192.168.1.XXX:8000"  // Your computer's IP

        // For physical device, use your computer's IP:
        // private const val BASE_URL = "http://192.168.1.100:8000"

        private const val HEALTH_ENDPOINT = "$BASE_URL/health"
        private const val ANALYZE_ENDPOINT = "$BASE_URL/analyze"
    }

    init {
        client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .addHeader("User-Agent", "TruthLens-Android/1.0")
                    .build()
                chain.proceed(request)
            }
            .build()

        gson = GsonBuilder()
            .setPrettyPrinting()
            .create()
    }

    /**
     * Check if backend is healthy and reachable
     */
    suspend fun checkHealth(): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(HEALTH_ENDPOINT)
                .get()
                .build()

            val response = client.newCall(request).execute()
            val isHealthy = response.isSuccessful

            Log.d(TAG, "Backend health check: ${if (isHealthy) "✅ Connected" else "❌ Failed"}")
            response.close()
            return@withContext isHealthy

        } catch (e: Exception) {
            Log.e(TAG, "Health check failed: ${e.message}")
            return@withContext false
        }
    }

    /**
     * Analyze content for misinformation
     * Core feature of TruthLens
     */
    suspend fun analyzeContent(
        content: String,
        contentType: String = "text",
        source: String = "manual"
    ): AnalysisResult = withContext(Dispatchers.IO) {

        try {
            val analysisRequest = AnalysisRequest(
                content = content,
                contentType = contentType,
                source = source
            )

            val jsonBody = gson.toJson(analysisRequest)
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(ANALYZE_ENDPOINT)
                .post(requestBody)
                .build()

            Log.d(TAG, "Analyzing content: ${content.take(50)}...")

            val response = client.newCall(request).execute()

            if (!response.isSuccessful) {
                throw IOException("Analysis failed: HTTP ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw IOException("Empty response from backend")

            Log.d(TAG, "Backend response: $responseBody")

            val result = gson.fromJson(responseBody, AnalysisResult::class.java)
            response.close()

            Log.d(TAG, "Analysis complete: ${result.riskLevel} (${(result.confidence * 100).toInt()}%)")
            return@withContext result

        } catch (e: Exception) {
            Log.e(TAG, "Content analysis failed: ${e.message}")

            // Return fallback result for offline scenarios
            return@withContext createFallbackResult(content, e.message ?: "Network error")
        }
    }

    /**
     * Create fallback analysis when backend is unavailable
     * Uses simple rule-based detection
     */
    private fun createFallbackResult(content: String, error: String): AnalysisResult {
        val contentLower = content.lowercase()
        val riskKeywords = listOf(
            "otp", "verify account", "urgent", "lottery won", "investment opportunity",
            "click here immediately", "limited time", "bank account blocked",
            "suspicious activity", "confirm details", "prize money"
        )

        val detectedRisks = riskKeywords.filter { contentLower.contains(it) }

        val (riskLevel, confidence, explanation, trafficLight, icon) = when {
            detectedRisks.isNotEmpty() -> {
                val risk = if (detectedRisks.size >= 2) "danger" else "caution"
                val conf = if (detectedRisks.size >= 2) 0.8 else 0.6
                val exp = "Offline detection found suspicious patterns: ${detectedRisks.joinToString(", ")}"
                val light = if (detectedRisks.size >= 2) "red" else "yellow"
                val ic = if (detectedRisks.size >= 2) "🚨" else "⚠️"
                listOf(risk, conf, exp, light, ic)
            }
            else -> {
                listOf("safe", 0.7, "Content appears safe (offline check)", "green", "✅")
            }
        }

        return AnalysisResult(
            riskLevel = riskLevel as String,
            confidence = confidence as Double,
            detectedPatterns = detectedRisks,
            explanation = "$explanation\n\n⚠️ Backend unavailable: $error",
            uiIndicators = UIIndicators(
                trafficLight = trafficLight as String,
                icon = icon as String,
                confidenceBar = ((confidence as Double) * 100).toInt(),
                voiceAlert = if (riskLevel != "safe") "Warning: This message might be suspicious" else ""
            )
        )
    }
}