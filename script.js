
let currentBudget = 3350;  // Default budget
let playersData = [];      // Will hold player data
let flagsData = [];
let draftMode = false;
let round = 0;
let teams = [];
let captains = {};

let maxPlayersPerTeam = 4;
let numTeams = 15;

let defaultBudget = 3350; // default budget, only used on reset/startup
let firstRoundBudget = 1000;
let round2BudgetLimit = 0;
let round3BudgetLimit = 0;
let round4BudgetLimit = 0;
//let round5BudgetLimit = 0;

let draftHistory = [];

document.getElementById('draftModeButton').addEventListener('click', () => {
    draftMode = !draftMode;
    if (draftMode) {
        document.getElementById('draftModeButton').innerText = 'Stop Draft Mode';
        startDraftMode();
    } else {
        document.getElementById('draftModeButton').innerText = 'Start Draft Mode';
        stopDraftMode(true);
    }
});

document.getElementById('undoButton').addEventListener('click', undoLastDraftAction);

function startDraftMode() {
    resetTeams();
    // Get the round budget limits from the input fields
    const round1BudgetLimit = parseInt(document.getElementById('round1Budget').value, 10);
    round2BudgetLimit = parseInt(document.getElementById('round2Budget').value, 10);
    round3BudgetLimit = parseInt(document.getElementById('round3Budget').value, 10);
    round4BudgetLimit = parseInt(document.getElementById('round4Budget').value, 10);
    //round5BudgetLimit = parseInt(document.getElementById('round5Budget').value, 10);

    // Get all captains
    console.log('Captains:', captains);

    // Calculate initial team budgets and sort teams
    teams = Array.from(document.querySelectorAll('.team')).map(team => {
        // Find the captain for this team
        const captain = captains[team.id];
        console.log(`Team id: ${team.id}, Captain: ${captain ? captain.name : 'N/A'}`);
        let captainRating = 0;
        let captainName = '';  
        if (captain) {
            captainRating = captain.rating;
            captainName = captain.name;
        } else {
            console.log(`No captain found for ${team.id}`);
        }
        return {
            id: team.id,
            name: captainName,
            initialBudget: firstRoundBudget - captainRating,
            roundBudget: 0,
            playersPicked: [], 
            players: team.querySelectorAll('.player').length,  // Update the players property
            round1TotalBudget: firstRoundBudget - captainRating + round1BudgetLimit,
            round2TotalBudget: 0,  // Will be calculated after round 1
            round3TotalBudget: 0,  // Will be calculated after round 2
            round4TotalBudget: 0,  // Will be calculated after round 3
            //round5TotalBudget: 0   // Will be calculated after round 4
        };
    });
    teams.sort((a, b) => b.initialBudget - a.initialBudget || a.name.localeCompare(b.name));  // Sort in descending order by budget, then in ascending order by name

    // Start round 1
    round = 1;
    teams.forEach(team => team.roundBudget = team.round1TotalBudget);
    highlightNextTeam();

    // Clear draft history when starting a new draft
    draftHistory = [];
    updateUndoButtonState();
}

function stopDraftMode(manualStop = false) {

    console.log('stopDraftMode called, manualStop:', manualStop);
    console.log('Teams player count:', teams.map(team => team.players));


    // If not all teams have maxPlayersPerTeam players and the function was not called manually, do nothing
    if (!manualStop && !teams.every(team => team.players === maxPlayersPerTeam)) {
        console.log(`Draft mode not stopped: Not all teams have ${maxPlayersPerTeam} players and the stop was not manual.`);
        return;
    }

    if (teams.every(team => team.players === maxPlayersPerTeam)) {
        document.getElementById('draftModeButton').innerText = 'Start Draft Mode';
        draftMode = false;
        saveData();
        console.log(`Draft mode stopped: All teams have ${maxPlayersPerTeam} players.`);
        // Workaround to deal with some odd bugs when draft mode completes, e.g. the last player picked not appearing in the last team.
        loadData();
        loadPlayers();
        return;
    }
    
    draftMode = false;
    round = 0;

    // Update the players count for each team
    teams = teams.map(team => {
        const teamElement = document.getElementById(team.id);
        const playersCount = teamElement.querySelectorAll('.player').length;
        return {
            ...team,
            players: playersCount
        };
    });

    // Remove team highlights
    document.querySelectorAll('.team').forEach(team => team.style.outline = '');

    // Add player slots to each team until the total number of players and slots is maxPlayersPerTeam+1 (need captain too)
    document.querySelectorAll('.team').forEach(team => {
        fillEmptySlots(team);
    });

    document.querySelectorAll('.player.drafted').forEach(player => {
        player.classList.remove('drafted');
    });

    // Initialize drag and drop functionality for the new player slots
    initializeDragAndDrop();

    draftHistory = [];
    updateUndoButtonState();
}

function highlightNextTeam() {
    console.log('Current round:', round);
    console.log('Teams player count:', teams.map(team => team.players));

    // Remove highlight from all teams
    document.querySelectorAll('.team').forEach(team => team.style.outline = '');

    // If all teams have picked in the current round, move to the next round
    if (teams.every(team => team.players >= round)) {
        round++;
        // Do not exceed the maximum number of rounds
        if (round > maxPlayersPerTeam) {
            console.log('Maximum number of rounds reached.');
            stopDraftMode();
            return;
        }
        recalculateRoundBudgets();
        // Re-sort teams based on round budget
        teams.sort((a, b) => b.roundBudget - a.roundBudget || a.name.localeCompare(b.name));
    }

    // Find the next team that can pick a player
    const nextTeam = teams.find(team => team.players < round);
    if (nextTeam) {
        // Highlight the team
        document.getElementById(nextTeam.id).style.outline = '2px solid green';
    }

    updateUndoButtonState();
}

function recalculateRoundBudgets() {
    if (round === 2) {
        teams.forEach(team => {
            const playerPickedRating = team.playersPicked[0] || 0;
            team.round2TotalBudget = team.round1TotalBudget - playerPickedRating + round2BudgetLimit;
            team.roundBudget = team.round2TotalBudget;
            updateTeamInfo(team.id);
        });
    } else if (round === 3) {
        teams.forEach(team => {
            const playerPickedRating = team.playersPicked[1] || 0;
            team.round3TotalBudget = team.round2TotalBudget - playerPickedRating + round3BudgetLimit;
            team.roundBudget = team.round3TotalBudget;
            updateTeamInfo(team.id);
        });
    } else if (round === 4) {
        teams.forEach(team => {
            const playerPickedRating = team.playersPicked[2] || 0;
            team.round4TotalBudget = team.round3TotalBudget - playerPickedRating + round4BudgetLimit;
            team.roundBudget = team.round4TotalBudget;
            updateTeamInfo(team.id);
        });
    }
}

// Function to load players from the JSON file
function loadPlayers() {
    // Fetch flags data first
    fetch('flags.json')
        .then(response => response.json())
        .then(data => {
            flagsData = data;

            // Then fetch players data
            fetch('players.json')
                .then(response => response.json())
                .then(data => {
                    playersData = data;
                    createPlayerElements(data);
                    assignCaptainsToTeams(data);  // Assign captains to teams
                    initializeTeams();  // Initialize team info
                    sortPlayers();

                    // Initialize drag and drop functionality after players are created
                    initializeDragAndDrop();

                    // Load saved data after fetching player data
                    loadData();
                })
                .catch(error => console.error('Error loading player data:', error));
        })
        .catch(error => console.error('Error loading flags data:', error));

        // Add event listener to search input
        document.getElementById('searchInput').addEventListener('input', function(event) {
            const searchTerm = event.target.value;
            filterPlayers(searchTerm);
        });

        document.getElementById('minRating').addEventListener('input', filterPlayers);
        document.getElementById('maxRating').addEventListener('input', filterPlayers);
}

function createPlayerElements(players) {
    const playersContainer = document.getElementById('players');
    playersContainer.innerHTML = ''; // Clear existing players
    players.filter(player => player.Role === 'Player' || player.Role === 'Co-Captain').forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.draggable = true;
        
        playerDiv.id = player.Player; // Unique identifier
        playerDiv.setAttribute('data-rating', player.Rating); // Add this line

        // Get flag URL
        const flagData = flagsData.find(flag => flag.Country === player.Country);
        if (flagData) {
            const flagElement = document.createElement('img');
            flagElement.src = flagData.Flag;
            flagElement.className = 'flag-icon';
            playerDiv.appendChild(flagElement);
        }

        const playerText = document.createTextNode(`${player.Player} - Rating: ${player.Rating}`);
        playerDiv.appendChild(playerText);
        playerDiv.setAttribute('data-rating', player.Rating);
        playersContainer.appendChild(playerDiv);
    });
}

// Update the filterPlayers function
function filterPlayers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const minRating = parseInt(document.getElementById('minRating').value) || 0;
    const maxRating = parseInt(document.getElementById('maxRating').value) || 1000;
    
    const playersContainer = document.getElementById('players');
    const players = playersContainer.getElementsByClassName('player');

    for (let player of players) {
        const playerName = player.textContent.toLowerCase();
        const playerRating = parseInt(player.getAttribute('data-rating'));
        
        if (playerName.includes(searchTerm) && 
            playerRating >= minRating && 
            playerRating <= maxRating) {
            player.style.display = '';
        } else {
            player.style.display = 'none';
        }
    }
}

function fillEmptySlots(team) {
    if (!(team.id) || team.id === 'players') {
      return;
    }
    
    while (team.querySelectorAll('.player, .player-slot').length < (maxPlayersPerTeam+1)) {
        const playerSlot = document.createElement('div');
        playerSlot.className = 'player-slot';
        team.appendChild(playerSlot);
    }
};

function assignCaptainsToTeams(players) {
    // Get all captains and sort them by rating
    const captains = players.filter(player => player.Role === 'Captain');
    captains.sort((a, b) => a.Rating - b.Rating);

    // Assign each captain to a team
    captains.forEach((captain, index) => {
        captain.Team = `team${index + 1}`;
    });

    createTeamElements(players);
}

function createTeamElements(players) {
    for (let i = 1; i <= numTeams; i++) {
        const teamContainer = document.getElementById(`team${i}`);
        teamContainer.innerHTML = ''; // Clear team

        // Add the captain
        const captain = players.find(player => player.Role === 'Captain' && player.Team === `team${i}`);
        if (captain) {
            const captainDiv = document.createElement('div');
            captainDiv.className = 'player captain';  // Add 'captain' class
            captainDiv.textContent = `${captain.Player} - Rating: ${captain.Rating}`;
            captainDiv.setAttribute('data-rating', captain.Rating);

            // Get flag URL
            const flagData = flagsData.find(flag => flag.Code === captain.Code);
            if (flagData) {
                const flagElement = document.createElement('img');
                flagElement.src = flagData.Flag;
                flagElement.className = 'flag-icon';
                captainDiv.prepend(flagElement);  // Add the flag before the player's name
            }

            teamContainer.appendChild(captainDiv);
            sortPlayers();

            captains[`team${i}`] = {
                name: captain.Player,
                rating: captain.Rating
            };
        }

        // Add empty slots
        fillEmptySlots(teamContainer);
    }
}

function undoLastDraftAction() {
    if (draftHistory.length === 0) return;

    const lastAction = draftHistory.pop();
    if (lastAction.action === 'draft') {
        const player = document.getElementById(lastAction.player);
        const fromTeam = document.getElementById(lastAction.fromTeam);
        const toTeam = document.getElementById(lastAction.toTeam);

        // Move the player back to the original team or player list
        if (fromTeam.id === 'players') {
            fromTeam.appendChild(player);
            sortPlayers();
        } else {
            const emptySlot = toTeam.querySelector('.player-slot') || document.createElement('div');
            emptySlot.className = 'player-slot';
            toTeam.replaceChild(emptySlot, player);
            fromTeam.appendChild(player);
        }

        // Remove 'drafted' class from player
        player.classList.remove('drafted');

        // Update team data
        const teamData = teams.find(t => t.id === toTeam.id);
        if (teamData) {
            teamData.players--;
            teamData.roundBudget += parseInt(player.getAttribute('data-rating'), 10);
            teamData.playersPicked.pop();  // Remove the last picked player
        }

        // Update team info
        updateTeamInfo(toTeam.id);
        if (fromTeam.id !== 'players') {
            updateTeamInfo(fromTeam.id);
        }

        // Revert to previous round if necessary
        if (teams.every(team => team.players < round)) {
            round--;
            // Recalculate round budgets when reverting to previous round
            recalculateRoundBudgets();
        }

        // Re-sort teams based on round budget
        teams.sort((a, b) => b.roundBudget - a.roundBudget || a.name.localeCompare(b.name));

        // Re-highlight the next team
        highlightNextTeam();
    }

    updateUndoButtonState();
}

// New: Function to update the Undo button state
function updateUndoButtonState() {
    const undoButton = document.getElementById('undoButton');
    undoButton.disabled = !draftMode || draftHistory.length === 0;
}

function initializeDragAndDrop() {
    document.querySelectorAll('.player').forEach(player => {
        player.addEventListener('dragstart', event => {
            if (!player.classList.contains('drafted')) {
                event.dataTransfer.setData('text/plain', event.target.id);
            } else {
                event.preventDefault();
            }
        });
    });

    document.querySelectorAll('.team').forEach(team => {
        team.addEventListener('dragover', event => {
            event.preventDefault();  // This allows the drop event
        });

        team.addEventListener('drop', event => {
            event.preventDefault();
            const playerId = event.dataTransfer.getData('text/plain');
            const player = document.getElementById(playerId);
            if (player) {
                // Store the old team ID before adding the player to the new team
                const oldTeamId = player.parentElement.id;
                
                if (draftMode) {
                    const teamData = teams.find(t => t.id === team.id);
                    const nextTeam = teams.find(t => t.players < round);

                    if (teamData && teamData === nextTeam && canAddPlayerToTeam(team, player)) {
                        const emptySlot = team.querySelector('.player-slot');
                        if (emptySlot) {
                            // Add player to team in DOM
                            team.replaceChild(player, emptySlot);
                            // Mark player as drafted
                            player.classList.add('drafted');
                            // Update team data
                            teamData.players++;
                            teamData.roundBudget -= parseInt(player.getAttribute('data-rating'), 10);
                            // Update team's displayed info
                            updateTeamInfo(team.id);
                            // Save changes
                            saveData();
                            // New: Add this action to the draft history
                            draftHistory.push({
                                action: 'draft',
                                player: player.id,
                                fromTeam: oldTeamId,
                                toTeam: team.id
                            });
                            // After player has been added, check whether draft mode should continue
                            highlightNextTeam();
                        }
                    }
                } else {
                    if (canAddPlayerToTeam(team, player)) {
                        const emptySlot = team.querySelector('.player-slot');
                        if (emptySlot) {
                            team.replaceChild(player, emptySlot);
                        } else {
                            // If there are no empty slots, replace an existing player
                            team.replaceChild(player, team.querySelector('.player'));
                        }
                        fillEmptySlots(team);  // Fill the team with empty slots
                        updateTeamInfo(team.id);  // Update the team info of the new team
                        sortPlayers();
                        saveData();  // Save the teams after a player is moved
                    } else {
                        document.getElementById('players').appendChild(player);
                        fillEmptySlots(team);
                        sortPlayers();
                    }
                }
            
                // Create a new player slot in the old team if the player was moved from another team
                if (oldTeamId.startsWith('team') && player.parentElement.id.startsWith('team') && player.parentElement.id !== oldTeamId) {
                    const oldTeam = document.getElementById(oldTeamId);
                    fillEmptySlots(oldTeam);
                    updateTeamInfo(oldTeamId); // Update the team info of the old team
                    sortPlayers();
                }
            }
        });
    });

    // Add event listeners to the players div
    const playersDiv = document.getElementById('players');

    playersDiv.addEventListener('dragover', event => {
        event.preventDefault();
    });

    playersDiv.addEventListener('drop', event => {
        event.preventDefault();
        const playerId = event.dataTransfer.getData('text/plain');
        const player = document.getElementById(playerId);
        if (player) {
            // Store the old team ID before moving the player
            const oldTeamId = player.parentElement.id;
            // Remove player from any team and add back to the player list
            playersDiv.appendChild(player);
            // Remove 'drafted' class from player
            player.classList.remove('drafted');
            // Update the team info of the old team before removing the player
            if (oldTeamId !== 'players') {
                updateTeamInfo(oldTeamId);
                fillEmptySlots(oldTeamId);
            }
            // Sort players in the player list
            sortPlayers();
            // Save changes
            saveData();
        }
    });
}

function canAddPlayerToTeam(team, player) {
    let teamRating = Array.from(team.children).reduce((total, elem) => {
        return total + (elem.getAttribute('data-rating') ? parseInt(elem.getAttribute('data-rating'), 10) : 0);
    }, 0);
    let playerRating = parseInt(player.getAttribute('data-rating'), 10);

    // Check if there's an available slot in the team
    let availableSlots = Array.from(team.children).filter(elem => elem.className === 'player-slot').length;

    // If in Draft Mode, check if player's rating is less than or equal to the team's round budget
    if (draftMode) {
        const teamData = teams.find(t => t.id === team.id);
        if (teamData) {
            let roundBudget;
            if (round === 1) {
                roundBudget = teamData.round1TotalBudget;
            } else if (round === 2) {
                roundBudget = teamData.round2TotalBudget;
            } else if (round === 3) {
                roundBudget = teamData.round3TotalBudget;
            } else if (round === 4) {
                roundBudget = teamData.round4TotalBudget;
            }/* else if (round === 5) {
                roundBudget = teamData.round5TotalBudget;
            }*/
            console.log(`Team ID: ${team.id}, Round: ${round}, Round Budget: ${roundBudget}`);  // Log the round budget for the team

            // If the player can be added to the team, add the player's rating to the playersPicked array
            if (playerRating <= roundBudget && availableSlots > 0) {
                teamData.playersPicked.push(playerRating);
                updateTeamInfo(team.id);
                return true;
            }
            return false;
        }
    }

    // If not in Draft Mode, check if the team rating plus player rating is less than or equal to the current budget
    return (teamRating + playerRating) <= currentBudget && availableSlots > 0;
}

function updateTeamInfo(teamId) {

    if (teamId === 'players') {
        return;
    }
    const team = document.getElementById(teamId);
    let teamRating = 0;

    team.querySelectorAll('.player').forEach(player => {
        teamRating += parseInt(player.getAttribute('data-rating'), 10);
    });

    const ratingSpan = document.getElementById(`${teamId}-rating`);
    const budgetSpan = document.getElementById(`${teamId}-budget`);
    
    ratingSpan.textContent = `Rating: ${teamRating}`;
    budgetSpan.textContent = `Remaining Budget: ${currentBudget - teamRating}`;

    // Change text color to red if team is over budget
    if (teamRating > currentBudget) {
        ratingSpan.style.color = 'red';
        budgetSpan.style.color = 'red';
    } else {
        ratingSpan.style.color = '';
        budgetSpan.style.color = '';
    }

    const roundBudgetSpan = document.getElementById(`${teamId}-round-budget`);
    if (roundBudgetSpan) {  // Check that roundBudgetSpan is not null
        if (draftMode) {
            const teamData = teams.find(t => t.id === teamId);
            if (teamData) {
                let roundBudget = teamData.roundBudget;
                roundBudgetSpan.textContent = `Round Budget Limit: ${roundBudget}`;
            }
            roundBudgetSpan.style.display = "";  // Show the round budget limit
        } else {
            roundBudgetSpan.style.display = "none";  // Hide the round budget limit
        }
    }
    // Bit of a workaround to force empty slots to appear when they were going missing from teams unexpectedly.
    fillEmptySlots(team);
}

function setBudget() {
    const budgetInput = document.getElementById('budgetInput');
    currentBudget = parseInt(budgetInput.value, 10);
    saveData();
    initializeTeams();  // Update team info
}

function resetTeams() {
    // Remove all players from teams
    document.querySelectorAll('.team .player').forEach(player => {
        document.getElementById('players').appendChild(player);
    });

    // Reset playersData and currentBudget to their initial state
    playersData = [];
    currentBudget = defaultBudget;

    // Clear saved team data
    sessionStorage.removeItem('teams');
    sessionStorage.removeItem('playersData');
    sessionStorage.removeItem('currentBudget');

    // Reload players and flags data
    loadPlayers();

    // Reinitialize drag and drop functionality
    initializeDragAndDrop();
}

function initializeTeams() {
    for (let i = 1; i <= numTeams; i++) {
        updateTeamInfo(`team${i}`);
    }
}

function sortPlayers() {
    const playersContainer = document.getElementById('players');
    Array.from(playersContainer.getElementsByClassName('player'))
        .sort((a, b) => parseInt(b.getAttribute('data-rating')) - parseInt(a.getAttribute('data-rating')))
        .forEach(player => playersContainer.appendChild(player));
}

function saveData() {
    sessionStorage.setItem('playersData', JSON.stringify(playersData));
    sessionStorage.setItem('currentBudget', currentBudget.toString());
    sessionStorage.setItem('teams', JSON.stringify(Array.from(document.querySelectorAll('.team')).map(team => {
        return {
            id: team.id,
            players: Array.from(team.querySelectorAll('.player')).map(player => player.id)
        };
    })));
}

// Load data from sessionStorage
function loadData() {
    playersData = JSON.parse(sessionStorage.getItem('playersData')) || [];
    currentBudget = parseInt(sessionStorage.getItem('currentBudget'), 10) || defaultBudget;
    const savedTeams = JSON.parse(sessionStorage.getItem('teams')) || [];
    savedTeams.forEach(savedTeam => {
        const team = document.getElementById(savedTeam.id);
        const playerSlots = Array.from(team.querySelectorAll('.player-slot'));
        const savedPlayers = savedTeam.players.map(playerId => document.getElementById(playerId)).filter(player => player);
        savedPlayers.sort((a, b) => parseInt(b.getAttribute('data-rating')) - parseInt(a.getAttribute('data-rating')));
        savedPlayers.forEach((player, index) => {
            if (playerSlots[index]) {
                team.replaceChild(player, playerSlots[index]);
            }
        });
    });
    document.getElementById('budgetInput').value = currentBudget;
    initializeTeams();

    // Initialize drag and drop functionality after player slots are created
    initializeDragAndDrop();
}
loadData();
loadPlayers();
