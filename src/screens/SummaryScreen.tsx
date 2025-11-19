import React from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../App';
import { useCapture } from '../providers/CaptureProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

const SummaryScreen: React.FC<Props> = ({ navigation }) => {
  const { steps, photos, reset, setCurrentIndex } = useCapture();

  const handleRetake = (index: number) => {
    setCurrentIndex(index);
    navigation.navigate('CaptureFlow');
  };

  const handleFinish = () => {
    reset();
    navigation.navigate('Welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Özet</Text>
      <FlatList
        data={steps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const uri = photos[item.id];
          return (
            <TouchableOpacity style={styles.card} onPress={() => handleRetake(index)}>
              {uri ? (
                <Image source={{ uri }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardPlaceholder}>
                  <Text style={styles.cardPlaceholderText}>Yok</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>
                  {uri ? 'Fotoğraf hazır' : 'Fotoğraf eksik'}
                </Text>
              </View>
              <Text style={styles.cardButtonText}>Tekrar çek</Text>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishText}>Başlangıca dön</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  cardPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholderText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  cardDesc: {
    marginTop: 4,
    color: '#94a3b8',
  },
  cardButtonText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  finishButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  finishText: {
    color: '#022c22',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SummaryScreen;

