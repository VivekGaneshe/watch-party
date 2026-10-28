# YouTube Watch Party 🎬

A real-time YouTube Watch Party application that lets users create rooms, invite friends, and watch videos together with synchronized playback.

## Live Demo

- **App:** [YouTube Watch Party](https://watch-party-3i88gjnmj-watch-party-project.vercel.app)
- **Server Health:** https://watch-party-n8vi.onrender.com/health

> The Render free-tier server may take up to a minute to wake after inactivity.

## Features

- Create rooms with unique 6-character codes.
- Join rooms using a code or invite link.
- Real-time video play, pause, seek, and video changes.
- Role-based permissions: Host, Moderator, and Participant.
- Participant management and approval requests.
- Live participant list, chat, and emoji reactions.
- MongoDB persistence for room information.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Database | MongoDB, Mongoose |
| Video | YouTube IFrame Player API |
| Deployment | Vercel, Render, MongoDB Atlas |

## Architecture

1. React provides the user interface.
2. Express REST APIs create rooms and check room codes.
3. MongoDB stores persistent room information.
4. Socket.IO sends real-time events between participants.
5. The server validates permissions and broadcasts updated video state.

```text
React Frontend
      |
      | REST API
      v
Express + Node.js
      |
      |------ MongoDB
      |
      |------ Socket.IO
                 |
          Connected Users
```

## Run Locally

**Requirements:** Node.js and a MongoDB connection string.

### Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### Frontend

Open another terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_SERVER_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas

Configure `MONGO_URI` and `CLIENT_URL` on Render, and `VITE_SERVER_URL` on Vercel.

## Known Limitations

- Active room state is stored in memory and may be lost if the server restarts.
- Users do not have persistent login identities.
- Multiple server instances require shared room state.
- Some YouTube videos do not allow embedding.

## Future Improvements

- Authentication and persistent user identities.
- Redis-based room state for scaling.
- Saved chat history.
- Automated tests for permissions and room management.

## Author

**Vivek Ganeshe**  
B.Tech – Computer Science and Information Technology
