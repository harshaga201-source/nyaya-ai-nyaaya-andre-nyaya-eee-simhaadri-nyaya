import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Colors, BORDER, BORDER_THIN } from '../constants/Colors';
import { ScalesOfJustice } from '../constants/Illustrations';
import { LANGUAGES, getUI } from '../constants/Translations';
import { saveLanguage } from '../services/storage';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

// Brutalist header: black slab, hard yellow bottom border, blocky yellow language button.
export const Header: React.FC<HeaderProps> = ({ currentLanguage, onLanguageChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const currentLangObj = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];
  const t = getUI(currentLanguage);

  const handleSelect = (code: string) => {
    saveLanguage(code);
    onLanguageChange(code);
    setModalVisible(false);
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <ScalesOfJustice size={26} color={Colors.ink} secondaryColor={Colors.ink} />
        </View>
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>NYAYA{'\n'}SATHI</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.langButton}
        activeOpacity={0.85}
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
              <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
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
                      {lang.native}
                    </Text>
                    <Text style={styles.langEnglish}>{lang.name}</Text>
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
    backgroundColor: Colors.pitchBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'web' ? 10 : 8,
    paddingBottom: 10,
    borderBottomWidth: BORDER + 1,
    borderBottomColor: Colors.yellow,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    backgroundColor: Colors.yellow,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
  },
  titleWrapper: {
    marginLeft: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFDF7',
    letterSpacing: 1.5,
    lineHeight: 19,
    textTransform: 'uppercase',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.yellow,
    borderColor: Colors.pitchBlack,
    borderWidth: BORDER_THIN,
    paddingHorizontal: 12,
    paddingVertical: 9,
    boxShadow: '4px 4px 0 #FFD400',
  },
  langIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  langText: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langDropdownIcon: {
    color: Colors.ink,
    fontSize: 10,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.card,
    borderWidth: BORDER,
    borderColor: Colors.pitchBlack,
    padding: 18,
    maxHeight: '82%',
    boxShadow: '8px 8px 0 #000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: Colors.pitchBlack,
    paddingBottom: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    backgroundColor: Colors.pitchBlack,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 16,
    color: '#FFFDF7',
    fontWeight: '900',
  },
  langList: {
    maxHeight: 380,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
    marginVertical: 4,
    backgroundColor: Colors.card,
  },
  langOptionSelected: {
    backgroundColor: Colors.yellow,
  },
  langName: {
    fontSize: 16,
    color: Colors.ink,
    fontWeight: '900',
    flex: 1,
  },
  langEnglish: {
    fontSize: 10,
    color: Colors.faintInk,
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  langTextSelected: {
    color: Colors.ink,
    fontWeight: '900',
  },
  checkIcon: {
    color: Colors.pitchBlack,
    fontSize: 18,
    fontWeight: '900',
  },
});
