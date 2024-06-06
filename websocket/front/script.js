let room = '';
let socketid = '';
const roomArea = document.querySelector('#room');
//const socket = io('http://localhost:3000');
const socket = io('https://puissance-4-socket-1.onrender.com/');
socket.on('connect', () => {
    console.log('Connected');
});
socket.on('disconnect', () => {
    console.log('Disconnected');
});

let join = () => {
    let roomName = roomArea.value;
    console.log('join room: ' + roomName);
    socket.emit('join', roomName);
    room = roomName;
}

socket.on('update p4', (matrix) => {
    matrix.forEach((row, x) => {
        row.forEach((cell, y) => {
            const cellEl = document.querySelector(`.cell[data-row="${x}"][data-column="${y}"]`);
            if (cell === 1) {
                cellEl.style.backgroundColor = 'red';
            } else if (cell === 2) {
                cellEl.style.backgroundColor = 'yellow';
            }
        });
    });
});

roomArea.addEventListener('change', (e) => {
    socket.emit('leave', room);
    socket.emit('join', e.target.value);
    room = e.target.value;
});

const p4 = document.getElementById('puissance4');
for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.classList.add('row');
    for (let j = 0; j < 7; j++) {
        const cellEl = document.createElement('div');
        cellEl.classList.add('cell');
        cellEl.dataset.column = j;
        cellEl.dataset.row = i;
        cellEl.onclick = (event) => cell(i, j, event);
        row.appendChild(cellEl);
    }
    p4.appendChild(row);
}

let cell = (x, y) => {
    socket.emit('shot', roomArea.value, x, y);
}

socket.on('message', (message) => {
    document.getElementById('message').innerText = message;
});

socket.on('player number', (numPlayer) => {
    document.querySelector('.player-num').innerText = numPlayer;
});
