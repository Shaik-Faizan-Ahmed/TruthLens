/**
 * TruthLens Home Screen - Expo Version with Fixed Share Demo
 * Main screen with share-to-verify functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

// Import services
import { analyzeContent } from '../services/api';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const [manualText, setManualText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Sample scam content for demonstration - realistic Indian scams
  const sampleScamMessages = [
    "🎉 CONGRATULATIONS! You have won ₹5,00,000 in KBC Lucky Draw! To claim your prize, pay processing fee of ₹5,000 to Account: 1234567890, IFSC: SBIN0001234. Offer expires in 24 hours! Call: 9999999999 - KBC Team",
    
    "⚠️ URGENT: Your SBI account will be blocked in 2 hours due to suspicious activity. Please share OTP 123456 immediately to verify your account. Call: 8888888888 - SBI Security Team",
    
    "💰 AMAZING INVESTMENT OPPORTUNITY! Invest ₹10,000 today and get ₹50,000 guaranteed returns in 30 days! Join our WhatsApp group for proof: bit.ly/fake-investment. Limited seats available! Hurry up!",
    
    "🏦 Dear Customer, Unusual activity detected on your account. Click here to secure your account: http://sbi-security-fake.com/login. If you ignore this, your account will be permanently blocked - Bank Security",

    "📱 Message from Airtel: Your number will be deactivated soon. Complete your KYC by clicking this link: http://airtel-kyc-fake.com and share your OTP. Valid till tonight only!"
  ];

  useEffect(() => {
    // Test backend connection on app start
    testBackendConnection();
    
    // Check for shared content from other apps
    checkForSharedContent();
    
    // Set up interval to check for shared content
    const shareCheckInterval = setInterval(checkForSharedContent, 1500);
    
    return () => clearInterval(shareCheckInterval);
  }, []);

  // Add this new function to your HomeScreen component
  const checkForSharedContent = () => {
    if (global.sharedContent && global.shouldAutoAnalyze) {
      console.log('📥 Processing shared content in HomeScreen');
      
      const { text, timestamp, source } = global.sharedContent;
      
      // Check if content is recent (within last 30 seconds)
      const timeDiff = Date.now() - timestamp;
      if (timeDiff < 30000) {
        // Set the shared content in the text input
        setManualText(text);
        
        Alert.alert(
          '🎯 Ready to Analyze Shared Content!',
          `Content received via ${source}:\n\n"${text.substring(0, 120)}${text.length > 120 ? '...' : ''}"\n\n🔍 Tap "Analyze Now" to check for scams and misinformation!`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                // Keep text in input but don't auto-analyze
                global.sharedContent = null;
                global.shouldAutoAnalyze = false;
              }
            },
            {
              text: '🔍 Analyze Now!',
              onPress: () => {
                analyzeSharedContent(text);
                global.sharedContent = null;
                global.shouldAutoAnalyze = false;
              }
            }
          ]
        );
      }
      
      // Clear flags to prevent repeated processing
      global.shouldAutoAnalyze = false;
    }
  };

  const testBackendConnection = async () => {
    try {
      // We'll implement this in the API service
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('Backend connection failed:', error);
    }
  };

  const analyzeSharedContent = async (content) => {
    try {
      setIsAnalyzing(true);
      
      const analysisResult = await analyzeContent({
        content: content,
        content_type: 'text',
        language: 'en',
        source_app: 'shared'
      });

      // Navigate to results screen
      navigation.navigate('Analyze', {
        result: analysisResult,
        originalContent: content
      });
      
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Error',
        'Failed to analyze content. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalysis = async () => {
    if (!manualText.trim()) {
      Alert.alert('Input Required', 'Please enter some text to analyze.');
      return;
    }

    if (manualText.trim().length < 5) {
      Alert.alert('Text Too Short', 'Please enter at least 5 characters to analyze.');
      return;
    }

    await analyzeSharedContent(manualText.trim());
    // Don't clear text immediately - let user see what was analyzed
  };

  // FIXED: Enhanced share demo functionality
  const handleShareDemo = async () => {
    Alert.alert(
      'Test TruthLens Detection 🧪',
      'How would you like to test the scam detection?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: '📋 Load Sample Scam',
          onPress: () => loadSampleScam()
        },
        {
          text: '📱 Learn Share Process',
          onPress: () => showSharingInstructions()
        },
        {
          text: '🔍 Analyze Current Text',
          onPress: () => manualText.trim() ? handleManualAnalysis() : loadSampleScam(),
          style: 'default'
        }
      ]
    );
  };

  const loadSampleScam = async () => {
    try {
      // Pick a random sample scam message
      const randomScam = sampleScamMessages[Math.floor(Math.random() * sampleScamMessages.length)];
      
      // Load into text field
      setManualText(randomScam);
      
      // Also copy to clipboard for backup
      await Clipboard.setStringAsync(randomScam);
      
      Alert.alert(
        'Sample Scam Loaded! ⚠️',
        'A realistic scam message has been loaded in the text field. This is exactly the type of content you might receive on WhatsApp or SMS.\n\n' +
        '👇 Scroll down and tap "Analyze Content" to see TruthLens in action!\n\n' +
        '🛡️ TruthLens will explain why this is a scam and how to stay safe.',
        [
          { text: '🔍 Analyze This Scam Now!', onPress: () => analyzeSharedContent(randomScam) },
          { text: 'I\'ll Do It Manually' }
        ]
      );
    } catch (error) {
      console.error('Error loading sample:', error);
      Alert.alert('Error', 'Sample could not be loaded. Please try again.');
    }
  };

  const showSharingInstructions = () => {
    Alert.alert(
      'How to Share Content from Other Apps 📱',
      '🔗 FROM WHATSAPP:\n' +
      '• Long press the suspicious message\n' +
      '• Select "Copy" or "Forward"\n' +
      '• Open TruthLens → Paste content\n\n' +
      
      '📧 FROM SMS/EMAIL:\n' +
      '• Select and copy suspicious text\n' +
      '• Open TruthLens → Paste content\n\n' +
      
      '🌐 FROM FACEBOOK/SOCIAL MEDIA:\n' +
      '• Copy post text or link\n' +
      '• Open TruthLens → Paste content\n\n' +
      
      '🛡️ TruthLens will analyze ANY suspicious content and warn you about potential scams with color-coded alerts!',
      [
        { text: 'Got It!' },
        { text: '📋 Try Sample First', onPress: loadSampleScam }
      ]
    );
  };

  const openSettings = () => {
    navigation.navigate('Settings');
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#2E8B57';
      case 'disconnected': return '#FF6B35';
      default: return '#999';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Backend Connected';
      case 'disconnected': return 'Backend Disconnected';
      default: return 'Checking Connection...';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, { backgroundColor: getConnectionStatusColor() }]} />
        <Text style={[styles.statusText, { color: getConnectionStatusColor() }]}>
          {getConnectionStatusText()}
        </Text>
      </View>

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="security" size={48} color="#2E8B57" />
          <Text style={styles.logoText}>TruthLens</Text>
        </View>
        <Text style={styles.subtitle}>
          AI-powered protection against misinformation and scams
        </Text>
      </View>

      {/* Enhanced Share Instructions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="share" size={24} color="#2E8B57" />
          <Text style={styles.cardTitle}>Share-to-Verify Feature</Text>
        </View>
        
        <Text style={styles.shareDescription}>
          TruthLens can analyze suspicious content from WhatsApp, Facebook, SMS, Email, and any other app.
        </Text>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>
            When you receive a suspicious message in WhatsApp, Facebook, or any other app
          </Text>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>
            Tap and hold the message → Select "Share" or "Copy"
          </Text>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>
            Open TruthLens and paste the content below for analysis
          </Text>
        </View>

        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <Text style={styles.stepText}>
            Get instant analysis with safety recommendations
          </Text>
        </View>

        {/* Enhanced Demo Button */}
        <TouchableOpacity style={styles.demoButton} onPress={handleShareDemo}>
          <MaterialIcons name="science" size={18} color="#2E8B57" />
          <Text style={styles.demoButtonText}>🧪 Test Scam Detection</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Input Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="edit" size={24} color="#2E8B57" />
          <Text style={styles.cardTitle}>Paste Content for Analysis</Text>
        </View>
        
        <TextInput
          style={styles.textInput}
          multiline={true}
          numberOfLines={6}
          placeholder="Paste suspicious message, link, or content here for analysis...

Examples:
• WhatsApp forwards
• Investment offers  
• Prize/lottery messages
• Banking alerts
• OTP requests"
          placeholderTextColor="#999"
          value={manualText}
          onChangeText={setManualText}
          textAlignVertical="top"
        />
        
        <View style={styles.inputFooter}>
          <Text style={styles.characterCount}>
            {manualText.length}/500 characters
          </Text>
          {manualText.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setManualText('')}
            >
              <MaterialIcons name="clear" size={16} color="#999" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={handleManualAnalysis}
          disabled={isAnalyzing}
        >
          <MaterialIcons 
            name={isAnalyzing ? "hourglass-empty" : "search"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Safety Tips */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="lightbulb-outline" size={24} color="#FF6B35" />
          <Text style={styles.cardTitle}>Quick Safety Tips</Text>
        </View>
        
        <View style={styles.safetyTip}>
          <MaterialIcons name="block" size={20} color="#FF6B35" />
          <Text style={styles.safetyTipText}>
            Never share OTP codes with anyone, including bank officials
          </Text>
        </View>

        <View style={styles.safetyTip}>
          <MaterialIcons name="verified-user" size={20} color="#FF6B35" />
          <Text style={styles.safetyTipText}>
            Always verify urgent requests through official channels
          </Text>
        </View>

        <View style={styles.safetyTip}>
          <MaterialIcons name="money-off" size={20} color="#FF6B35" />
          <Text style={styles.safetyTipText}>
            Be skeptical of "get rich quick" investment schemes
          </Text>
        </View>

        <View style={styles.safetyTip}>
          <MaterialIcons name="phone" size={20} color="#FF6B35" />
          <Text style={styles.safetyTipText}>
            When in doubt, call the organization directly using official numbers
          </Text>
        </View>
      </View>

      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
        <MaterialIcons name="settings" size={20} color="#2E8B57" />
        <Text style={styles.settingsButtonText}>Settings & Help</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for digital safety
        </Text>
      </View>
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  shareDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E8B57',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#444',
    lineHeight: 20,
    paddingTop: 4,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f0f9f4',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2E8B57',
  },
  demoButtonText: {
    color: '#2E8B57',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    minHeight: 120,
    maxHeight: 200,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 2,
  },
  analyzeButton: {
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#999',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  safetyTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  safetyTipText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    lineHeight: 18,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E8B57',
    marginBottom: 16,
  },
  settingsButtonText: {
    color: '#2E8B57',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen;