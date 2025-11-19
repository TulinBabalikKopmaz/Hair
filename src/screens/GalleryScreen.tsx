import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// Icons will be simple text/emoji for now

import { RootStackParamList } from '../../App';
import { useCapture } from '../providers/CaptureProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

const GalleryScreen: React.FC<Props> = ({ navigation }) => {
  const { steps, photos, deletePhoto, setCurrentIndex } = useCapture();

  const handleDelete = (stepId: string, stepTitle: string) => {
    Alert.alert(
      'Fotoğrafı Sil',
      `${stepTitle} fotoğrafını silmek istediğinizden emin misiniz? Bu fotoğraf yeniden çekilecek.`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deletePhoto(stepId);
            // Galeri ekranından çık ve çekim ekranına dön
            navigation.goBack();
            navigation.navigate('CaptureFlow');
          },
        },
      ],
    );
  };

  const photosWithSteps = steps.map((step) => ({
    step,
    photo: photos[step.id],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Galeri</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={photosWithSteps}
        keyExtractor={(item) => item.step.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const { step, photo } = item;
          return (
            <View style={styles.card}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardPlaceholder}>
                  <Text style={styles.cardPlaceholderIcon}>📷</Text>
                  <Text style={styles.cardPlaceholderText}>Fotoğraf yok</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{step.title}</Text>
                <Text style={styles.cardDesc}>{step.description}</Text>
                {photo ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(step.id, step.title)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
  },
  backButtonText: {
    fontSize: 24,
    color: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardImage: {
    width: 120,
    height: 120,
    backgroundColor: '#1e293b',
  },
  cardPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardPlaceholderIcon: {
    fontSize: 32,
  },
  cardPlaceholderText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  cardInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  deleteButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GalleryScreen;

