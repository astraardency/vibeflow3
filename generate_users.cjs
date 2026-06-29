const fs = require('fs');
const path = require('path');

const users = [
  {
    id: "user_001",
    username: "melophile_1",
    email: "melophile1@example.com",
    preferences: {
      highQualityAudio: true,
      dataSaver: false,
      offlineMode: true
    },
    joinDate: "2023-01-15T10:00:00Z"
  },
  {
    id: "user_002",
    username: "vibe_master",
    email: "vibes@example.com",
    preferences: {
      highQualityAudio: true,
      dataSaver: true,
      offlineMode: false
    },
    joinDate: "2023-05-22T14:30:00Z"
  },
  {
    id: "user_003",
    username: "music_lover99",
    email: "lover99@example.com",
    preferences: {
      highQualityAudio: false,
      dataSaver: true,
      offlineMode: false
    },
    joinDate: "2024-02-10T08:15:00Z"
  }
];

const dir = path.join(__dirname, 'github');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
  console.log("Created directory: github");
}

users.forEach(user => {
  const filePath = path.join(dir, `${user.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf8');
  console.log(`Created file: ${filePath}`);
});

console.log("Successfully stored user data in json files! One file per user.");
