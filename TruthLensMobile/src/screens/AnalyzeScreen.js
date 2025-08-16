/**
 * TruthLens Analyze Screen - Results Display
 * Shows analysis results with traffic light indicators
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

const AnalyzeScreen = ({ route, navigation }) => {
  const { result, originalContent } = route.params;
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Auto-speak result for elderly users (can be disabled in settings)
    const speakResult = () => {
      if (result && result.risk_level === 'danger') {
        const warningText = `Warning! This content appears to be ${result.detected_patterns?.[0] || 'suspicious'}. Please be careful.`;
        Speech.speak(warningText, {
          language: 'en',
          pitch: 1.0,
          rate: 0.8,
        });
      }
    };

    // Delay to let screen load
    const timer = setTimeout(speakResult, 1000);
    return () => clearTimeout(timer);
  }, [result]);

  const getRiskColor = () => {
    switch (result?.risk_level) {
      case 'safe': return '#2E8B57';      // Green
      case 'caution': return '#FF8C00';   // Orange
      case 'danger': return '#FF4444';    // Red
      default: return '#999';             // Gray
    }
  };

  const getRiskIcon = () => {
    switch (result?.risk_level) {
      case 'safe': return 'verified';
      case 'caution': return 'warning';
      case 'danger': return 'dangerous';
      default: return 'help';
    }
  };

  const getRiskTitle = () => {
    switch (result?.risk_level) {
      case 'safe': return 'Content Appears Safe ✅';
      case 'caution': return 'Exercise Caution ⚠️';
      case 'danger': return 'High Risk - Be Careful! 🚨';
      default: return 'Analysis Complete';
    }
  };

  const getConfidenceDescription = (confidence) => {
    if (confidence >= 0.8) return 'Very Confident';
    if (confidence >= 0.6) return 'Confident';
    if (confidence >= 0.4) return 'Moderately Confident';
    return 'Low Confidence';
  };

  const speakExplanation = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    
    let textToSpeak = `Analysis result: ${getRiskTitle()}. `;
    
    if (result.explanation) {
      textToSpeak += result.explanation + '. ';
    }
    
    if (result.recommendations?.length > 0) {
      textToSpeak += 'Recommendations: ' + result.recommendations.join('. ') + '.';
    }

    try {
      await Speech.speak(textToSpeak, {
        language: 'en',
        pitch: 1.0,
        rate: 0.75,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const shareResult = async () => {
    try {
      const message = `TruthLens Analysis Result:
🎯 Risk Level: ${result.risk_level.toUpperCase()}
🔍 Confidence: ${Math.round(result.confidence * 100)}%
📋 Explanation: ${result.explanation}

Original Content:
"${originalContent.substring(0, 200)}${originalContent.length > 200 ? '...' : ''}"

Analyzed by TruthLens - AI-powered misinformation detection`;

      await Share.share({
        message: message,
        title: 'TruthLens Analysis Result',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const analyzeAnother = () => {
    navigation.goBack();
  };

  if (!result) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#FF4444" />
        <Text style={styles.errorText}>No analysis result available</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Main Result Card */}
      <View style={[styles.resultCard, { borderColor: getRiskColor() }]}>
        <View style={styles.resultHeader}>
          <View style={[styles.riskIndicator, { backgroundColor: getRiskColor() }]}>
            <MaterialIcons name={getRiskIcon()} size={32} color="#fff" />
          </View>
          <View style={styles.resultTitle}>
            <Text style={[styles.riskTitle, { color: getRiskColor() }]}>
              {getRiskTitle()}
            </Text>
            <Text style={styles.confidenceText}>
              {getConfidenceDescription(result.confidence)} • {Math.round(result.confidence * 100)}%
            </Text>
          </View>
        </View>

        {/* Confidence Bar */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Analysis Confidence:</Text>
          <View style={styles.confidenceBarBackground}>
            <View 
              style={[
                styles.confidenceBar, 
                { 
                  width: `${result.confidence * 100}%`,
                  backgroundColor: getRiskColor()
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Explanation Card */}
      {result.explanation && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={24} color="#2E8B57" />
            <Text style={styles.cardTitle}>Why This Analysis?</Text>
            <TouchableOpacity 
              style={styles.speakButton} 
              onPress={speakExplanation}
            >
              <MaterialIcons 
                name={isSpeaking ? "volume-off" : "volume-up"} 
                size={20} 
                color="#2E8B57" 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.explanationText}>{result.explanation}</Text>
        </View>
      )}

      {/* Detected Patterns */}
      {result.detected_patterns && result.detected_patterns.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="pattern" size={24} color="#FF8C00" />
            <Text style={styles.cardTitle}>Detected Patterns</Text>
          </View>
          {result.detected_patterns.map((pattern, index) => (
            <View key={index} style={styles.patternItem}>
              <MaterialIcons name="fiber-manual-record" size={12} color="#FF8C00" />
              <Text style={styles.patternText}>{pattern}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="recommend" size={24} color="#2E8B57" />
            <Text style={styles.cardTitle}>Safety Recommendations</Text>
          </View>
          {result.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <MaterialIcons name="check-circle" size={16} color="#2E8B57" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Original Content Preview */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="article" size={24} color="#666" />
          <Text style={styles.cardTitle}>Analyzed Content</Text>
        </View>
        <View style={styles.contentPreview}>
          <Text style={styles.originalContentText} numberOfLines={6}>
            {originalContent}
          </Text>
          {originalContent.length > 200 && (
            <Text style={styles.contentLength}>
              Content length: {originalContent.length} characters
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.shareButton]} 
          onPress={shareResult}
        >
          <MaterialIcons name="share" size={20} color="#2E8B57" />
          <Text style={styles.shareButtonText}>Share Result</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.analyzeAgainButton]} 
          onPress={analyzeAnother}
        >
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.analyzeAgainButtonText}>Analyze Another</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contacts (for high-risk content) */}
      {result.risk_level === 'danger' && (
        <View style={styles.emergencyCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="emergency" size={24} color="#FF4444" />
            <Text style={[styles.cardTitle, { color: '#FF4444' }]}>
              Need Help?
            </Text>
          </View>
          <Text style={styles.emergencyText}>
            If you've already acted on this content, consider:
          </Text>
          <View style={styles.emergencyAction}>
            <MaterialIcons name="phone" size={16} color="#FF4444" />
            <Text style={styles.emergencyActionText}>
              Contact your bank: Check for unauthorized transactions
            </Text>
          </View>
          <View style={styles.emergencyAction}>
            <MaterialIcons name="security" size={16} color="#FF4444" />
            <Text style={styles.emergencyActionText}>
              Cyber crime helpline: 1930 (for reporting scams)
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  resultTitle: {
    flex: 1,
  },
  riskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  speakButton: {
    padding: 8,
  },
  explanationText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 15,
    color: '#444',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  contentPreview: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  originalContentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  contentLength: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  shareButtonText: {
    color: '#2E8B57',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analyzeAgainButton: {
    backgroundColor: '#2E8B57',
  },
  analyzeAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emergencyCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ffcccc',
  },
  emergencyText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  emergencyAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  emergencyActionText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#2E8B57',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AnalyzeScreen;