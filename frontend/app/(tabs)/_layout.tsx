import React, { useContext } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { language } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.yellow,
        tabBarInactiveTintColor: '#E5E3DC',
        tabBarStyle: {
          backgroundColor: Colors.pitchBlack,
          borderTopColor: Colors.yellow,
          borderTopWidth: 6,
          height: Platform.OS === 'web' ? 82 : 76,
          paddingBottom: Platform.OS === 'web' ? 14 : 12,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.homeTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t.chatTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: t.voiceTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="document"
        options={{
          title: t.docTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="traffic"
        options={{
          title: t.trafficTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="complaint"
        options={{
          title: t.complaintTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="find-lawyer"
        options={{
          title: t.lawyersTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rights"
        options={{
          title: t.rightsTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: t.feedbackTab,
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
