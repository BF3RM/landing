const CREDITS_API_URL = 'https://hera-prod.bf3reality.com/api/v1/credits';

renderCredits();

async function renderCredits() {
    const creditsWrapper = document.getElementById('credits_wrapper');
    if (!creditsWrapper) {
        return;
    }
    
    const fetchedCredits = await fetchCredits();
    if (Object.entries(fetchedCredits).length === 0) {
        console.error("Credits is empty");
        return;
    }

    const creditsByRole = getCreditsByRole(fetchedCredits);
    for (const [role, credits] of Object.entries(creditsByRole)) {
        const roleDiv = createRoleDiv(role, credits);
        creditsWrapper.append(roleDiv);
    }
}

async function fetchCredits() {
    const response = fetch(CREDITS_API_URL)
        .then(resp => {
            return resp.json();
        })
        .catch(ex => {
            console.error(ex);
            return {};
        });
    return response;
}

function getCreditsByRole(credits) {
    const creditsByRole = {};
    credits.forEach(credit => {
        if (creditsByRole.hasOwnProperty(credit.role)) {
            creditsByRole[credit.role].push(credit);
        } else {
            creditsByRole[credit.role] = [credit];
        }
    });
    return creditsByRole;
}

function createRoleDiv(role, credits) {
    const roleDiv = document.createElement('div');
    roleDiv.classList.add('role');

    const roleH2 = document.createElement('h2');
    roleH2.textContent = role;
    roleDiv.append(roleH2);

    credits.forEach(credit => {
        const personDiv = document.createElement('div');
        personDiv.classList.add('person');

        const personH3 = document.createElement('h3');
        personH3.textContent = credit.username;

        personDiv.append(personH3);
        roleDiv.append(personDiv);
    });

    return roleDiv;
}
