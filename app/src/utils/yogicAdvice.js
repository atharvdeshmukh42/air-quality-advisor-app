const YOGIC_LEVELS = [
  {
    minAQI: 0,
    maxAQI: 50,
    level: 'Level 1: Good',
    title: 'Ideal Conditions for Full Practice',
    pranayama: [
      {
        name: 'Surya Bhedana (Right Nostril Breathing)',
        description:
          'Sit comfortably, close left nostril with ring finger, inhale deeply through the right nostril, close right nostril with thumb, exhale through left. Repeat 10-15 rounds. Energizes the body and stimulates metabolism.',
      },
      {
        name: 'Full Yogic Breath (Dirga Pranayama)',
        description:
          'Breathe deeply filling the abdomen, then ribcage, then chest in sequence. Exhale in reverse order. Practice for 5-10 minutes. Maximizes lung capacity and oxygen intake.',
      },
    ],
    asana: [
      {
        name: 'Vrikshasana (Tree Pose)',
        description:
          'Stand on one leg, place the other foot on inner thigh, arms overhead. Hold for 30-60 seconds each side. Improves balance and focus while encouraging deep breathing.',
      },
      {
        name: 'Surya Namaskar (Sun Salutation)',
        description:
          'Perform 6-12 rounds of the full sun salutation sequence. Best done outdoors in fresh air. Combines cardiovascular exercise with deep breathing and stretching.',
      },
    ],
    precaution: 'No restrictions. Enjoy outdoor practice and breathe freely.',
    verdict:
      'Air quality is excellent. This is the perfect time for vigorous outdoor yoga practice with deep breathing exercises.',
  },
  {
    minAQI: 51,
    maxAQI: 100,
    level: 'Level 2: Moderate',
    title: 'Modified Practice with Awareness',
    pranayama: [
      {
        name: 'Kapalbhati (Skull Shining Breath)',
        description:
          'Sit in a comfortable position, perform rapid forceful exhales through the nose with passive inhales. Start with 30 strokes, gradually increase to 60. Cleanses respiratory passages and strengthens diaphragm.',
      },
      {
        name: 'Bhastrika (Bellows Breath)',
        description:
          'Inhale and exhale forcefully through both nostrils with equal emphasis. Start with 10 rounds, rest, repeat 3 sets. Increases lung capacity and clears mild congestion.',
      },
    ],
    asana: [
      {
        name: 'Ustrasana (Camel Pose)',
        description:
          'Kneel, arch back, reach for heels. Opens the chest and improves respiratory capacity. Hold for 15-30 seconds, repeat 3 times.',
      },
      {
        name: 'Matsyasana (Fish Pose)',
        description:
          'Lie on back, arch chest upward, rest crown of head on floor. Opens throat and chest. Hold for 30-60 seconds. Helps expand lung capacity.',
      },
    ],
    precaution:
      'Listen to your body. If you feel any discomfort or shortness of breath, move practice indoors. Sensitive individuals should reduce intensity.',
    verdict:
      'Air quality is acceptable. Practice with moderate intensity and be mindful of any respiratory sensitivity.',
  },
  {
    minAQI: 101,
    maxAQI: 150,
    level: 'Level 3: Unhealthy for Sensitive Groups',
    title: 'Indoor Gentle Practice',
    pranayama: [
      {
        name: 'Chandra Bhedana (Left Nostril Breathing)',
        description:
          'Close the right nostril with the thumb, inhale through the left nostril slowly. Close left nostril, exhale through right. Repeat 10 rounds. Cools the system and calms the nervous system.',
      },
      {
        name: 'Ujjayi (Ocean Breath)',
        description:
          'Slightly constrict the back of the throat, breathe in and out through the nose creating a soft ocean-like sound. Practice for 5-10 minutes. Warms and filters incoming air naturally.',
      },
    ],
    asana: [
      {
        name: 'Shashankasana (Rabbit/Hare Pose)',
        description:
          'From kneeling, fold forward with arms extended or alongside the body. Rest forehead on the floor. Hold for 1-2 minutes. Calms the nervous system and supports gentle breathing.',
      },
      {
        name: 'Pawanmuktasana (Wind Release Pose)',
        description:
          'Lie on back, bring knees to chest, wrap arms around legs. Gently rock side to side. Hold for 1-2 minutes. Massages internal organs and promotes relaxation without demanding deep breathing.',
      },
    ],
    precaution:
      'Strictly practice indoors with windows closed. Use an air purifier if available. Avoid any forceful breathing techniques.',
    verdict:
      'Air quality is concerning for sensitive individuals. Keep all practices gentle and indoors with filtered air.',
  },
  {
    minAQI: 151,
    maxAQI: 200,
    level: 'Level 4: Unhealthy',
    title: 'Restorative & Calming Only',
    pranayama: [
      {
        name: 'Anulom Vilom (Alternate Nostril Breathing)',
        description:
          'Close right nostril, inhale left. Close left, exhale right. Inhale right, close right, exhale left. Very slow and gentle, 5-second inhale, 5-second exhale. Practice 10-15 rounds. Balances the nervous system without demanding deep air intake.',
      },
      {
        name: 'Bhramari (Humming Bee Breath)',
        description:
          'Close ears with thumbs, place fingers over eyes. Inhale gently, exhale with a humming sound. Repeat 7-10 times. The vibrations help clear sinuses and the controlled exhale limits pollutant intake.',
      },
    ],
    asana: [
      {
        name: 'Viparita Karani (Legs Up the Wall)',
        description:
          'Lie on back with legs resting up against a wall. Arms relaxed at sides. Hold for 5-10 minutes. Promotes circulation and relaxation without requiring increased respiration.',
      },
      {
        name: 'Shavasana (Corpse Pose)',
        description:
          'Lie flat on back, arms and legs slightly apart, palms facing up. Focus on natural, shallow breathing. Practice for 10-15 minutes. Complete relaxation minimizes air intake while promoting healing.',
      },
    ],
    precaution:
      'No strenuous yoga whatsoever. Practice only in well-sealed, air-purified indoor spaces. Keep breathing shallow and natural. If you experience any respiratory discomfort, stop immediately.',
    verdict:
      'Air quality is unhealthy. Only restorative, minimal-movement practices are recommended in purified indoor air.',
  },
  {
    minAQI: 201,
    maxAQI: 300,
    level: 'Level 5: Very Unhealthy',
    title: 'Meditation & Breath Awareness Only',
    pranayama: [
      {
        name: 'Natural Breath Awareness',
        description:
          'Simply observe your natural breath without trying to change it. Notice the cool air entering and warm air leaving the nostrils. Practice for 10-15 minutes. This is NOT a breathing exercise — it is pure observation to avoid increasing air intake.',
      },
      {
        name: 'Yoga Nidra (Yogic Sleep)',
        description:
          'Lie in Shavasana and follow a guided body scan and relaxation sequence. Practice for 20-30 minutes. Achieves deep relaxation with minimal respiratory activity.',
      },
    ],
    asana: [
      {
        name: 'Body Scan Meditation',
        description:
          'Lie or sit comfortably. Mentally scan from toes to crown, releasing tension in each area. No physical movement required. Practice for 15-20 minutes.',
      },
    ],
    precaution:
      'No physical asanas at all. Stay indoors with air purification running. Wear an N95 mask if you must go outside. Keep all windows and doors sealed. Focus only on mental and meditative practices.',
    verdict:
      'Air is very unhealthy. Avoid all physical practices. Focus exclusively on meditation and mental relaxation in sealed, purified rooms.',
  },
  {
    minAQI: 301,
    maxAQI: 999,
    level: 'Level 6: Hazardous',
    title: 'Emergency Protocol — Mental Practice Only',
    pranayama: [
      {
        name: 'Mantra Japa (Repetition)',
        description:
          'Silently repeat a calming mantra such as "Om" or "So-Hum" with each natural breath. Do not try to control breathing at all. Practice for 15-20 minutes. Calms anxiety about air quality while keeping respiratory effort minimal.',
      },
      {
        name: 'Dharana (Concentration) / Trataka',
        description:
          'Focus on a single point — a candle flame, a spot on the wall, or a mental image. Maintain unwavering attention for 5-10 minutes. Develops mental strength and provides distraction from environmental stress.',
      },
    ],
    asana: [
      {
        name: 'Metta (Loving-Kindness) Meditation',
        description:
          'Sit quietly and mentally send wishes of health and wellbeing to yourself, loved ones, and all beings affected by the poor air quality. Practice for 10-15 minutes.',
      },
    ],
    precaution:
      'All physical yoga is contraindicated. Do NOT practice any breathing exercises that increase air intake. Stay in sealed rooms with air purification. Use N95/N99 masks for any unavoidable movement. Monitor health closely and seek medical attention if experiencing respiratory distress.',
    verdict:
      'Air quality is hazardous — emergency level. All physical and breathing yoga practices are suspended. Only silent mental practices are safe.',
  },
];

export function getYogicIntervention(aqi) {
  const numericAQI = Number(aqi);
  if (isNaN(numericAQI) || numericAQI < 0) {
    return YOGIC_LEVELS[0];
  }

  const level = YOGIC_LEVELS.find(
    (l) => numericAQI >= l.minAQI && numericAQI <= l.maxAQI
  );

  return level || YOGIC_LEVELS[YOGIC_LEVELS.length - 1];
}

export default getYogicIntervention;
