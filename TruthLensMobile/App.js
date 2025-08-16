/**
 * TruthLens Expo App
 * Main Application Component with Share Intent Support
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useShareIntent } from 'expo-share-intent';
import { Alert, Platform } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import AnalyzeScreen from './src/screens/AnalyzeScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    console.log('🔄 Share Intent Status:', { hasShareIntent, error });
    console.log('📱 Platform:', Platform.OS);
    
    if (hasShareIntent && shareIntent) {
      console.log('🎯 Share intent received:', shareIntent);
      handleSharedContent(shareIntent);
      resetShareIntent();
    }
    
    if (error) {
      console.error('❌ Share intent error:', error);
      Alert.alert(
        'Share Error', 
        'There was an issue receiving shared content. You can still copy and paste content manually.',
        [{ text: 'OK' }]
      );
    }
  }, [hasShareIntent, shareIntent, error]);

  const handleSharedContent = (intent) => {
    console.log('📝 Processing shared content:', intent);
    
    let contentToAnalyze = '';
    
    // Extract text content
    if (intent.text && intent.text.trim()) {
      contentToAnalyze = intent.text.trim();
    } else if (intent.webUrl) {
      contentToAnalyze = intent.webUrl;
    }

    console.log('📋 Extracted content length:', contentToAnalyze.length);

    if (contentToAnalyze) {
      // Store shared content globally for HomeScreen to pick up
      global.sharedContent = {
        text: contentToAnalyze,
        timestamp: Date.now(),
        source: 'share-intent'
      };
      global.shouldAutoAnalyze = true;
      
      // Show immediate feedback
      const preview = contentToAnalyze.substring(0, 100);
      const truncated = contentToAnalyze.length > 100 ? '...' : '';
      
      Alert.alert(
        '✅ Content Received from Share!',
        `TruthLens received:\n\n"${preview}${truncated}"\n\n🔍 Opening analysis screen...`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              global.sharedContent = null;
              global.shouldAutoAnalyze = false;
            }
          },
          {
            text: 'Analyze! 🛡️',
            onPress: () => {
              console.log('✅ User confirmed analysis');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'No Text Found',
        'TruthLens could not find text content to analyze. Please try sharing:\n\n• Text messages\n• Social media posts\n• Website links',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#2E8B57" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2E8B57',
              elevation: 4,
              shadowOpacity: 0.3,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: '🛡️ TruthLens - Share Ready',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="Analyze"
            component={AnalyzeScreen}
            options={{
              title: 'Analysis Result',
              headerTitleAlign: 'center',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings & Help',
              headerTitleAlign: 'center',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  useEffect(() => {
    console.log('🚀 TruthLens App Started with Share Intent Support');
    console.log('📱 Platform:', Platform.OS);
  }, []);

  return <AppNavigator />;
}