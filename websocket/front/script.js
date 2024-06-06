import express from 'express';
import http from 'http';
import ip from 'ip';
import {Server} from 'socket.io';
import cors from 'cors';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const rooms = [];
let numPlayer = 0;
let matrix = [];
let currentPlayer = 1;

const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.use(cors());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.broadcast.emit('user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.broadcast.emit('user disconnected');

        const room = socket.room;
        if (room) {
            const roomInstance = io.sockets.adapter.rooms.get(room);
            if (!roomInstance || roomInstance.size === 0) {
                rooms[room] = [];
            } else {
                const otherPlayer = socket.numPlayer === 1 ? 2 : 1;
                io.to(room).emit('message', `Le joueur ${otherPlayer} a gagné la partie car l'autre joueur a quitté la salle`);
            }
        }
    });

    socket.on('shot', (room, y, x) => {
        if (socket.numPlayer !== currentPlayer) {
            socket.emit('message', 'Ce n\'est pas votre tour');
            return;
        }

        if (matrix[y] && matrix[y][x] === 0) {
            y = setFall(y, x);

            if (socket.numPlayer === 1) {
                matrix[y][x] = 1;
            } else if (socket.numPlayer === 2) {
                matrix[y][x] = 2;
            }

            if (!rooms[room]) {
                rooms[room] = [];
            }
            rooms[room].push(matrix);
            io.to(room).emit('update p4', matrix);
        }

        if (checkWin(matrix, socket.numPlayer)) {
            io.to(room).emit('message', `Le joueur ${socket.numPlayer} a gagné la partie`);
        }

        currentPlayer = currentPlayer === 1 ? 2 : 1;
    });

    socket.on('room', (room, msg) => {
        io.to(room).emit('message', msg);
    });

    socket.on('join', (room) => {
        const roomInstance = io.sockets.adapter.rooms.get(room);
        if (roomInstance && roomInstance.size > 2) {
            socket.emit('message', `La salle est déjà pleine`);
            return;
        }

        socket.join(room);
        socket.room = room;

        const roomSize = io.sockets.adapter.rooms.get(room).size;
        if (roomSize === 1) {
            socket.numPlayer = 1;
        } else if (roomSize === 2) {
            socket.numPlayer = 2;
            currentPlayer = 1;
        }
        socket.emit('player number', socket.numPlayer);

        if (io.sockets.adapter.rooms.get(room).size === 2) {
            createMatrix(6, 7);
        }

        io.to(room).emit('join', room);
    });

    socket.on('leave', (room) => {
        socket.leave(room);
        const roomInstance = io.sockets.adapter.rooms.get(room);
        if (roomInstance && roomInstance.size === 0) {
            rooms[room] = [];
        } else {
            io.to(room).emit('message', 'Vous avez remporté la partie');
        }
        io.to(room).emit('leave', room);
    });
});

const createMatrix = (rows, cols) => {
    matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix.push(new Array(cols).fill(0));
    }
    return matrix;
};

const setFall = (y, x) => {
    for (let i = matrix.length - 1; i >= 0; i--) {
        if (matrix[i][x] === 0) {
            return i;
        }
    }
};

server.listen(PORT, () => {
    console.log('Server ip : http://' + ip.address() + ":" + PORT);
});

const checkWin = (matrix, player) => {
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Check horizontal
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 3; c++) {
            if (matrix[r][c] === player && matrix[r][c + 1] === player && matrix[r][c + 2] === player && matrix[r][c + 3] === player) {
                return true;
            }
        }
    }

    // Check vertical
    for (let r = 0; r < rows - 3; r++) {
        for (let c = 0; c < cols; c++) {
            if (matrix[r][c] === player && matrix[r + 1][c] === player && matrix[r + 2][c] === player && matrix[r + 3][c] === player) {
                return true;
            }
        }
    }

    // Check diagonal (gauche à droite)
    for (let r = 0; r < rows - 3; r++) {
        for (let c = 0; c < cols - 3; c++) {
            if (matrix[r][c] === player && matrix[r + 1][c + 1] === player && matrix[r + 2][c + 2] === player && matrix[r + 3][c + 3] === player) {
                return true;
            }
        }
    }

    // Check diagonal (droite à gauche)
    for (let r = 3; r < rows; r++) {
        for (let c = 0; c < cols - 3; c++) {
            if (matrix[r][c] === player && matrix[r - 1][c + 1] === player && matrix[r - 2][c + 2] === player && matrix[r - 3][c + 3] === player) {
                return true;
            }
        }
    }
    return false;
};
