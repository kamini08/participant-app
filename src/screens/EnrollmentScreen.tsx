import React, { useState } from "react";
import { View, Text, TextInput, Button, SafeAreaView, ScrollView, Alert } from "react-native";

export default function EnrollmentScreen() {
  const [name, setName] = useState("");
  const [studyId, setStudyId] = useState("1");

  const studies = [
    { id: "1", name: "Ayurveda Diabetes Trial" },
    { id: "2", name: "Ashwagandha Stress Study" },
    { id: "3", name: "Turmeric Osteoarthritis Study" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>

        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          AIIA CTMS - Participant Enrollment
        </Text>

        <Text style={{ fontSize: 16, marginBottom: 15 }}>
          Select your study:
        </Text>

        <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 }}>
          {studies.map((study) => (
            <Button
              key={study.id}
              title={study.name}
              onPress={() => setStudyId(study.id)}
              style={study.id === study.id ? { backgroundColor: "#3b82f6", color: "white" } : {}}
            />
          ))}
        </View>

        <Text style={{ fontSize: 16, marginTop: 20, marginBottom: 10 }}>
          Enter your details:
        </Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText.setName
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Date of Birth (YYYY-MM-DD)"
          keyboardType="number-pad"
          value={""}
          onChangeText={()}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Contact Number"
          keyboardType="phone"
          value={""}
          onChangeText={()}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 15 }}
        />

        <Button
          title="Submit Enrollment"
          onPress=() => {
            if (name.trim()) {
              Alert.alert(
                "Enrollment Successful",
                `You have been enrolled in ${studies.find(s => s.id === studyId)!.name}`
              );
            } else {
              Alert.alert("Error", "Please enter your name");
            }
          }
          style={{ backgroundColor: "#10b981", padding: 12, borderRadius: 6 }}
        />

        <Text style={{ marginTop: 20, fontSize: 12, color: "#666" }}>
          By enrolling, you confirm you have read and agree to the informed consent terms.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}