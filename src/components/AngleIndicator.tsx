import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  angleReady: boolean;
  isStable?: boolean;
  hint: string;
};

const AngleIndicator: React.FC<Props> = ({
  angleReady,
  isStable = false,
  hint,
}) => {
  const statusText = angleReady
    ? isStable
      ? 'Açı uygun, sabit kal'
      : 'Açı tamam, telefonu sabitle'
    : hint;

  return (
    <View
      style={[
        styles.container,
        { borderColor: angleReady ? '#4ade80' : '#f97316' },
      ]}
    >
      <Text
        style={[
          styles.status,
          { color: angleReady && isStable ? '#4ade80' : '#f97316' },
        ]}
      >
        {statusText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 4,
  },
  status: {
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AngleIndicator;

