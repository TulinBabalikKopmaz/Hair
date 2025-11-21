/**
 * StepRuleBox
 *
 * Her adımda kullanıcıya gösterilecek kuralı (örneğin pozisyon, açı, yüz yönü) kutu içinde sunar.
 *
 * - Kural metni turuncu renkte ve belirgin şekilde gösterilir.
 * - Uygulama içi rehberlik ve adım açıklamaları için kullanılır.
 * - Tasarımda görsel bütünlük ve netlik sağlar.
 *
 * Sadece görsel ve bilgilendirme amaçlıdır, mantıksal bir işlevi yoktur.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StepRuleBoxProps {
    rule: string;
}

const RULE_BOX_WIDTH = 350; // Daha daha geniş kutu

const StepRuleBox: React.FC<StepRuleBoxProps> = ({ rule }) => (
    <View style={[styles.ruleBox, { width: RULE_BOX_WIDTH }]}>
        <Text style={styles.ruleTitle}>Kural:</Text>
        <Text style={styles.ruleText}>{rule}</Text>
    </View>
);

const styles = StyleSheet.create({
    ruleBox: {
        backgroundColor: 'rgba(0,0,0,0.65)', // Uygulama kutuları gibi yarı saydam siyah
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#fe6303ff', // Turuncu kenar
        paddingVertical: 12,
        paddingHorizontal: 10,
        marginVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#fe6303ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
    },
    ruleTitle: {
        color: '#fe6303ff', // Turuncu başlık
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 3,
        textAlign: 'left',
        alignSelf: 'flex-start',
    },
    ruleText: {
        color: '#fe6303ff', // Turuncu metin
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'left',
        alignSelf: 'flex-start',
    },
});

export default StepRuleBox;
