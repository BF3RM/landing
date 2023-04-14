const RM_SPY_API_URL = 'https://hera-prod.bf3reality.com/api/v1/server/info?onlyWithRound=1';

const RM_SPY_STATES = {
    "STARTING": 'Starting',
    "IN_PROGRESS": 'In progress',
};

const RM_SPY_MAPS = {
    "MP_001": "Grand Bazaar",
    "MP_003": "Teheran Highway",
    "MP_007": "Caspian Border",
    "MP_011": "Seine Crossing",
    "MP_012": "Operation Firestorm",
    "MP_013": "Damavand Peak",
    "MP_017": "Noshahr Canals",
    "MP_018": "Kharg Island",
    "MP_Subway": "Operation Metro",
    "XP1_001": "Karkand",
    "XP1_002": "Gulf of Oman",
    "XP1_003": "Sharqi Peninsula",
    "XP1_004": "Wake Island",
    "XP2_Palace": "Donya Fortress",
    "XP2_Office": "Operation 925",
    "XP2_Factory": "Scrapmetal",
    "XP2_Skybar": "Ziba Tower",
    "XP3_Alborz": "Alborz Mountains",
    "XP3_Shield": "Issue 226",
    "XP3_Desert": "Bandar Desert",
    "XP3_Valley": "Death Valley",
    "XP4_Parl": "Azadi Palace",
    "XP4_Quake": "Epicenter",
    "XP4_FD": "Markaz Monolith",
    "XP4_Rubble": "Talah Market",
    "XP5_001": "Riverside",
    "XP5_002": "Nebandan Flats",
    "XP5_003": "OP Lumberman",
    "XP5_004": "Sabalan Pipeline",
};

const RM_SPY_GAMEMODES = {
    "ConquestLarge0": "AAS Standard",
    "ConquestSmall0": "AAS Alternative",
    "ConquestAssaultLarge0": "AAS Standard",
    "ConquestAssaultSmall0": "Conquest Assault",
    "ConquestAssaultSmall1": "Conquest Assault: Day 2",
    "RushLarge0": "Rush",
    "SquadRush0": "Squad Rush",
    "SquadDeathMatch0": "Squad Deathmatch",
    "TeamDeathMatch0": "Team Deathmatch",
    "TeamDeathMatchC0": "Team DM Close Quarters",
    "Domination0": "Conquest Domination",
    "GunMaster0": "Gun Master",
    "TankSuperiority0": "Tank Superiority",
    "Scavenger0": "Scavenger",
    "CaptureTheFlag0": "Capture the Flag",
    "AirSuperiority0": "Air Superiority",
    "AdvanceAndSecureStd": "AAS Standard",
    "AdvanceAndSecureAlt": "AAS Alternative",
    "SkirmishStd": "Skirmish Standard",
    "SkirmishAlt": "Skirmish Alternative"
};

renderRmSyp();

async function renderRmSyp() {
    const rmSpyWrapper = document.getElementById('rm_spy_wrapper');
    if (!rmSpyWrapper) {
        return;
    }
    
    const fetchedRmSpy = await fetchRmSpy();
    if (Object.entries(fetchedRmSpy).length === 0) {
        console.error("RmSpy is empty");
        return;
    }

    for (const server of fetchedRmSpy) {
        const serverDiv = createServerDiv(server);
        rmSpyWrapper.append(serverDiv);
    }
};

async function fetchRmSpy() {
    const response = fetch(RM_SPY_API_URL)
        .then(resp => {
            return resp.json();
        })
        .catch(ex => {
            console.error(ex);
            return {};
        });
    return response;
};

function createServerDiv(server) {
    const serverDiv = document.createElement('div');
    serverDiv.classList.add('server');
    
    const levelName = server.roundLevelName.substring(server.roundLevelName.lastIndexOf("/") + 1);

    const serverMapImage = document.createElement('img');
    serverMapImage.src = `https://s3.bf3reality.com/assets/loadingscreens/${levelName.toLowerCase()}.png`;
    serverMapImage.height = 95;
    serverDiv.append(serverMapImage);



    const serverName = document.createElement('span');
    serverName.classList.add('server-name');
    serverName.textContent = server.name;
    prependMobileText(serverName, 'Name');
    serverDiv.append(serverName);

    const serverMap = document.createElement('span');
    serverMap.classList.add('server-map');
    serverMap.textContent = server.roundLevelName ? RM_SPY_MAPS[levelName] : '';
    prependMobileText(serverMap, 'Map');
    serverDiv.append(serverMap);

    const serverGameMode = document.createElement('span');
    serverGameMode.classList.add('server-gamemode');
    serverGameMode.textContent = server.roundGameMode ? RM_SPY_GAMEMODES[server.roundGameMode] : '';
    prependMobileText(serverGameMode, 'Gamemode');
    serverDiv.append(serverGameMode);

    const serverPlayers = document.createElement('span');
    serverPlayers.classList.add('server-players');
    serverPlayers.textContent = server.roundPlayers;
    prependMobileText(serverPlayers, 'Player count');
    serverDiv.append(serverPlayers);

    return serverDiv;
};

function prependMobileText(element, text) {
    const mobileText = document.createElement('div');
    mobileText.classList.add('mobile-text');
    mobileText.textContent = `${text}: `;
    element.prepend(mobileText);
};
