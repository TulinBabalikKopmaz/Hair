/**
 * RuleDivider
 *
 * Kural kutuları ve adım bölümleri arasında görsel bir ayraç (turuncu çizgi) gösterir.
 *
 * - StepRuleBox ve diğer rehber kutuları arasında yatay bir çizgi olarak kullanılır.
 * - Tasarımda bölümleri ayırmak ve görsel bütünlük sağlamak için eklenmiştir.
 *
 * Sadece stil ve görsellik amaçlıdır, mantıksal bir işlevi yoktur.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

const RuleDivider: React.FC = () => {
    return <View style={styles.divider} />;
};

const styles = StyleSheet.create({
    divider: {
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF9800', // StepRuleBox ile aynı turuncu
        marginVertical: 12,
        marginHorizontal: 24,
        opacity: 0.7,
    },
});

export default RuleDivider;
