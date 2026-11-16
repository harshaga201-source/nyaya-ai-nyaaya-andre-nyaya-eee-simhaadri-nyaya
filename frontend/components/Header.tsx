import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { ScalesOfJustice } from '../constants/Illustrations';
import { LANGUAGES } from '../constants/Translations';
import { saveLanguage } from '../services/storage';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLanguage, onLanguageChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const currentLangObj = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  const handleSelect = (code: string) => {
    saveLanguage(code);
    onLanguageChange(code);
    setModalVisible(false);
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandRow}>
        <ScalesOfJustice size={32} color={Colors.gold} secondaryColor={Colors.ivory} />
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>NyayaSathi</Text>
          <Text style={styles.subtitle}>न्यायसाथी • Legal Assistant</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.langButton}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.langIcon}>🌐</Text>
        <Text style={styles.langText}>{currentLangObj.native}</Text>
        <Text style={styles.langDropdownIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Preferred Language / भाषा चुनें</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.langList}>
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isSelected && styles.langOptionSelected]}
                    onPress={() => handleSelect(lang.code)}
                  >
                    <Text style={[styles.langName, isSelected && styles.langTextSelected]}>
                      {lang.native} ({lang.name})
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 8,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.gold,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrapper: {
    marginLeft: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '600',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: Colors.gold,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  langDropdownIcon: {
    color: Colors.gold,
    fontSize: 10,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  closeButton: {
    fontSize: 18,
    color: Colors.textMuted,
    padding: 4,
  },
  langList: {
    maxHeight: 380,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  langOptionSelected: {
    backgroundColor: '#F1F5F9',
  },
  langName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  langTextSelected: {
    color: Colors.navy,
    fontWeight: '800',
  },
  checkIcon: {
    color: Colors.goldDark,
    fontSize: 16,
    fontWeight: '800',
  },
});
