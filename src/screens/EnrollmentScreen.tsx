import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EnrollmentScreen() {
  const [name, setName] = useState("");
  const [studyId, setStudyId] = useState("1");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");

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
            <TouchableOpacity
              key={study.id}
              accessibilityRole="button"
              onPress={() => setStudyId(study.id)}
              style={{
                backgroundColor: study.id === studyId ? "#3b82f6" : "#ffffff",
                borderRadius: 6,
                marginBottom: 8,
                padding: 12,
              }}
            >
              <Text style={{ color: study.id === studyId ? "#ffffff" : "#17324d" }}>
                {study.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 16, marginTop: 20, marginBottom: 10 }}>
          Enter your details:
        </Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Date of Birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Contact Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 15 }}
        />

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            if (name.trim()) {
              Alert.alert(
                "Enrollment Successful",
                `You have been enrolled in ${studies.find(s => s.id === studyId)!.name}`
              );
            } else {
              Alert.alert("Error", "Please enter your name");
            }
          }}
          style={{ backgroundColor: "#10b981", padding: 12, borderRadius: 6, alignItems: "center" }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Submit Enrollment</Text>
        </TouchableOpacity>

        <Text style={{ marginTop: 20, fontSize: 12, color: "#666" }}>
          By enrolling, you confirm you have read and agree to the informed consent terms.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}