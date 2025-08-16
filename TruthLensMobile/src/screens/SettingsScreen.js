/**
 * TruthLens Settings Screen - Settings and Help
 * Configuration options and help for elderly users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

// Import API service
import { testConnection, testAPI, updateBaseURL, getAPIConfig } from '../services/api';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    voiceAlerts: true,
    autoSpeak: true,
    vibration: true,
    darkMode: false,
    language: 'en',
    apiURL: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [apiURL, setApiURL] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('truthlens_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      }
      
      // Get current API config
      const apiConfig = getAPIConfig();
      setApiURL(apiConfig.baseURL);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('truthlens_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const testBackend = async () => {
    setIsLoading(true);
    try {
      const result = await testAPI();
      Alert.alert(
        'Backend Test Successful! ✅',
        `Test analysis completed:\n\n` +
        `Risk Level: ${result.risk_level}\n` +
        `Confidence: ${Math.round(result.confidence * 100)}%\n` +
        `Patterns: ${result.detected_patterns?.join(', ') || 'None'}\n\n` +
        `Your backend is working correctly!`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      Alert.alert(
        'Backend Test Failed ❌',
        `Could not connect to backend:\n\n${error.message}\n\n` +
        `Common solutions:\n` +
        `• Check if Docker container is running\n` +
        `• Verify the API URL in settings\n` +
        `• Check your internet connection`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

//   const [showUrlInput, setShowUrlInput] = useState(false);
//   const [tempUrl, setTempUrl] = useState('');

  const updateApiURL = () => {
    setTempUrl(apiURL);
    setShowUrlInput(true);
  };

  const saveApiURL = () => {
    if (tempUrl && tempUrl.trim()) {
      const cleanUrl = tempUrl.trim();
      updateBaseURL(cleanUrl);
      setApiURL(cleanUrl);
      setShowUrlInput(false);
      Alert.alert('Success', 'API URL updated successfully!');
      checkConnection();
    } else {
      Alert.alert('Error', 'Please enter a valid URL');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const testVoice = () => {
    const testText = "This is a test of the TruthLens voice feature. Voice alerts are working correctly.";
    Speech.speak(testText, {
      language: settings.language,
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const openHelp = () => {
    Alert.alert(
      'TruthLens Help 📖',
      'How to use TruthLens effectively:\n\n' +
      '🔍 ANALYZING CONTENT:\n' +
      '• Copy suspicious messages from WhatsApp/Facebook\n' +
      '• Paste them in the main screen\n' +
      '• Tap "Analyze Content" to get results\n\n' +
      '🚦 UNDERSTANDING RESULTS:\n' +
      '• Green = Safe content\n' +
      '• Orange = Exercise caution\n' +
      '• Red = High risk, be careful!\n\n' +
      '🔊 VOICE FEATURES:\n' +
      '• Enable voice alerts for audio warnings\n' +
      '• Tap the speaker icon to hear explanations\n\n' +
      '⚙️ BACKEND CONNECTION:\n' +
      '• Ensure Docker container is running\n' +
      '• Update API URL if using physical device\n' +
      '• Use "Test Backend" to verify connection',
      [{ text: 'Got it!' }]
    );
  };

  const openAbout = () => {
    Alert.alert(
      'About TruthLens 🛡️',
      'TruthLens v1.0\n\n' +
      'AI-powered misinformation detection designed especially for elderly users.\n\n' +
      '🎯 PURPOSE:\n' +
      'Protect against scams, fake news, and misinformation spreading through social media and messaging apps.\n\n' +
      '🤖 TECHNOLOGY:\n' +
      'Uses rule-based detection and AI analysis to identify common scam patterns, suspicious URLs, and misleading content.\n\n' +
      '❤️ BUILT WITH CARE:\n' +
      'Specifically designed with large text, voice alerts, and simple interface for elderly accessibility.\n\n' +
      'Made with ❤️ for digital safety',
      [{ text: 'Close' }]
    );
  };

  const clearData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will reset all settings to default. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              const defaultSettings = {
                voiceAlerts: true,
                autoSpeak: true,
                vibration: true,
                darkMode: false,
                language: 'en',
                apiURL: '',
              };
              setSettings(defaultSettings);
              Alert.alert('Success', 'All data cleared and settings reset!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
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
      case 'connected': return 'Backend Connected ✅';
      case 'disconnected': return 'Backend Disconnected ❌';
      default: return 'Checking Connection...';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="settings" size={32} color="#2E8B57" />
        <Text style={styles.headerText}>Settings & Help</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Connection</Text>
        
        <View style={styles.connectionCard}>
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
            <Text style={[styles.statusText, { color: getConnectionStatusColor() }]}>
              {getConnectionStatusText()}
            </Text>
          </View>
          
          <Text style={styles.apiUrlText}>
            API URL: {apiURL || 'Not configured'}
          </Text>
          
          <View style={styles.connectionButtons}>
            <TouchableOpacity style={styles.connectionButton} onPress={checkConnection}>
              <MaterialIcons name="refresh" size={16} color="#2E8B57" />
              <Text style={styles.connectionButtonText}>Check</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.connectionButton, isLoading && styles.disabledButton]} 
              onPress={testBackend}
              disabled={isLoading}
            >
              <MaterialIcons name="science" size={16} color="#2E8B57" />
              <Text style={styles.connectionButtonText}>
                {isLoading ? 'Testing...' : 'Test Backend'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.connectionButton} onPress={updateApiURL}>
              <MaterialIcons name="edit" size={16} color="#2E8B57" />
              <Text style={styles.connectionButtonText}>Update URL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* URL Input Modal */}
        {showUrlInput && (
          <View style={styles.urlInputModal}>
            <Text style={styles.urlInputTitle}>Update Backend URL</Text>
            <Text style={styles.urlInputInstructions}>
              For physical device, use your computer's IP address:
              {'\n'}http://192.168.1.XXX:8000
              {'\n\n'}For emulator:
              {'\n'}http://10.0.2.2:8000
            </Text>
            <TextInput
              style={styles.urlInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.XXX:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.urlInputButtons}>
              <TouchableOpacity 
                style={[styles.urlButton, styles.cancelButton]} 
                onPress={() => setShowUrlInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.urlButton, styles.saveButton]} 
                onPress={saveApiURL}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Voice & Alert Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice & Alerts</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="volume-up" size={24} color="#2E8B57" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Voice Alerts</Text>
              <Text style={styles.settingDescription}>
                Speak warnings for dangerous content
              </Text>
            </View>
          </View>
          <Switch
            value={settings.voiceAlerts}
            onValueChange={() => toggleSetting('voiceAlerts')}
            trackColor={{ false: '#ccc', true: '#2E8B57' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="record-voice-over" size={24} color="#2E8B57" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Auto Speak Results</Text>
              <Text style={styles.settingDescription}>
                Automatically read analysis results aloud
              </Text>
            </View>
          </View>
          <Switch
            value={settings.autoSpeak}
            onValueChange={() => toggleSetting('autoSpeak')}
            trackColor={{ false: '#ccc', true: '#2E8B57' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="vibration" size={24} color="#2E8B57" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>
                Vibrate phone for danger alerts
              </Text>
            </View>
          </View>
          <Switch
            value={settings.vibration}
            onValueChange={() => toggleSetting('vibration')}
            trackColor={{ false: '#ccc', true: '#2E8B57' }}
          />
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testVoice}>
          <MaterialIcons name="play-arrow" size={20} color="#2E8B57" />
          <Text style={styles.testButtonText}>Test Voice</Text>
        </TouchableOpacity>
      </View>

      {/* Help & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>
        
        <TouchableOpacity style={styles.helpItem} onPress={openHelp}>
          <MaterialIcons name="help" size={24} color="#2E8B57" />
          <View style={styles.helpText}>
            <Text style={styles.helpLabel}>How to Use TruthLens</Text>
            <Text style={styles.helpDescription}>
              Step-by-step guide for using all features
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem} onPress={openAbout}>
          <MaterialIcons name="info" size={24} color="#2E8B57" />
          <View style={styles.helpText}>
            <Text style={styles.helpLabel}>About TruthLens</Text>
            <Text style={styles.helpDescription}>
              Version info and app details
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.helpItem} 
          onPress={() => Linking.openURL('tel:1930')}
        >
          <MaterialIcons name="phone" size={24} color="#FF6B35" />
          <View style={styles.helpText}>
            <Text style={[styles.helpLabel, { color: '#FF6B35' }]}>
              Cyber Crime Helpline
            </Text>
            <Text style={styles.helpDescription}>
              Call 1930 to report scams and cyber crimes
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Common Scam Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Scam Examples</Text>
        
        <View style={styles.scamExampleCard}>
          <View style={styles.scamHeader}>
            <MaterialIcons name="warning" size={20} color="#FF6B35" />
            <Text style={styles.scamTitle}>OTP/Banking Scams</Text>
          </View>
          <Text style={styles.scamExample}>
            "Your account will be blocked. Share OTP: 123456 to verify"
          </Text>
          <Text style={styles.scamTip}>
            💡 Banks NEVER ask for OTP over phone or message
          </Text>
        </View>

        <View style={styles.scamExampleCard}>
          <View style={styles.scamHeader}>
            <MaterialIcons name="warning" size={20} color="#FF6B35" />
            <Text style={styles.scamTitle}>Prize/Lottery Scams</Text>
          </View>
          <Text style={styles.scamExample}>
            "Congratulations! You won ₹5 lakh in KBC lottery. Pay ₹5000 processing fee"
          </Text>
          <Text style={styles.scamTip}>
            💡 Legitimate lotteries never ask for money upfront
          </Text>
        </View>

        <View style={styles.scamExampleCard}>
          <View style={styles.scamHeader}>
            <MaterialIcons name="warning" size={20} color="#FF6B35" />
            <Text style={styles.scamTitle}>Investment Scams</Text>
          </View>
          <Text style={styles.scamExample}>
            "Invest ₹10,000 today, get ₹50,000 in 30 days. Guaranteed returns!"
          </Text>
          <Text style={styles.scamTip}>
            💡 High returns always come with high risk - be cautious
          </Text>
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={clearData}>
          <MaterialIcons name="delete-forever" size={24} color="#FF4444" />
          <View style={styles.dangerText}>
            <Text style={styles.dangerLabel}>Clear All Data</Text>
            <Text style={styles.dangerDescription}>
              Reset all settings to default
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          TruthLens v1.0 • Made with ❤️ for digital safety
        </Text>
        <Text style={styles.footerSubtext}>
          Protecting families from misinformation and scams
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  connectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  apiUrlText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  connectionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  connectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E8B57',
  },
  connectionButtonText: {
    color: '#2E8B57',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  settingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E8B57',
    marginTop: 8,
  },
  testButtonText: {
    color: '#2E8B57',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  helpItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  helpText: {
    marginLeft: 12,
    flex: 1,
  },
  helpLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  helpDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scamExampleCard: {
    backgroundColor: '#fff9f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  scamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 8,
  },
  scamExample: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  scamTip: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#fff0f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  dangerText: {
    marginLeft: 12,
    flex: 1,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF4444',
  },
  dangerDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  urlInputModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  urlInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  urlInputInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  urlInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  urlButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#2E8B57',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;