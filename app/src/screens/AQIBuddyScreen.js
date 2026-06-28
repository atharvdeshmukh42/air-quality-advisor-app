import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { chatWithBuddy } from '../utils/api';

export default function AQIBuddyScreen() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I'm AQI Buddy 🤖. I'm here to help you understand everything related to the Air Quality Index (AQI), air pollutants, and how they affect your health and environment.\n\nHow can I assist you with air quality information today?",
    },
  ]);

  const flatListRef = useRef(null);

  // Auto-scroll to the bottom of the list when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setError(null);

    // Create unique ID for the new message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Map message structure to what backend expects (role and content)
      const apiPayload = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const data = await chatWithBuddy(apiPayload);

      setMessages((prev) => [
        ...prev,
        {
          id: `buddy-${Date.now()}`,
          role: 'model',
          content: data.reply,
        },
      ]);
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to connect to AQI Buddy. Please check your connection and try again.';
      setError(errMsg);
      // Remove the last user message from state so they can try sending again easily
      // Or keep it and show error so they see what failed
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: "Hello! I'm AQI Buddy 🤖. I'm here to help you understand everything related to the Air Quality Index (AQI), air pollutants, and how they affect your health and environment.\n\nHow can I assist you with air quality information today?",
      },
    ]);
    setError(null);
    setInputText('');
  };

  const renderMessageText = (text, isUser) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
      <View style={styles.markdownContainer}>
        {lines.map((line, index) => {
          const trimmed = line.trim();
          const isBullet = line.startsWith('* ') || line.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('- ');
          let cleanText = line;

          if (isBullet) {
            if (line.startsWith('* ') || line.startsWith('- ')) {
              cleanText = line.substring(2);
            } else {
              cleanText = trimmed.substring(2);
            }
          }

          // Parse **bold** markers
          const parts = cleanText.split('**');
          const textComponents = parts.map((part, pIdx) => {
            const isBold = pIdx % 2 === 1;
            return (
              <Text
                key={pIdx}
                style={[
                  isBold && styles.boldText,
                  isUser ? styles.userText : styles.buddyText,
                ]}
              >
                {part}
              </Text>
            );
          });

          if (trimmed === '' && index < lines.length - 1) {
            return <View key={index} style={styles.paragraphSpacer} />;
          }

          return (
            <View key={index} style={[styles.lineRow, isBullet && styles.bulletRow]}>
              {isBullet && (
                <Text style={[styles.bulletDot, isUser ? styles.userText : styles.buddyText]}>
                  •{' '}
                </Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.buddyText,
                  isBullet && styles.bulletText,
                ]}
              >
                {textComponents}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userContainer : styles.buddyContainer,
        ]}
      >
        {!isUser && <Text style={styles.avatar}>🤖</Text>}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.buddyBubble,
          ]}
        >
          {renderMessageText(item.content, isUser)}
        </View>
        {isUser && <Text style={styles.avatar}>👤</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 110}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AQI Buddy</Text>
            <Text style={styles.headerSubtitle}>AI Air Quality Expert</Text>
          </View>
          {messages.length > 1 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearChat}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear Chat</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={() => (
            <>
              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.avatar}>🤖</Text>
                  <View style={[styles.messageBubble, styles.buddyBubble, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
                    <Text style={styles.loadingText}>AQI Buddy is thinking...</Text>
                  </View>
                </View>
              )}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}
            </>
          )}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about AQI, PM2.5, precautions..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  buddyContainer: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatar: {
    fontSize: 22,
    marginHorizontal: 6,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 2,
  },
  buddyBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  buddyText: {
    color: '#1A202C',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignSelf: 'center',
    width: '90%',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 13,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#1A202C',
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  markdownContainer: {
    flexDirection: 'column',
  },
  boldText: {
    fontWeight: 'bold',
  },
  paragraphSpacer: {
    height: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginVertical: 1,
  },
  bulletRow: {
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 15,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
  },
});
