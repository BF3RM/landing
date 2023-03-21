const CREDITS_API_URL = 'https://hera-prod.bf3reality.com/api/v1/credits';

renderCredits();

async function renderCredits() {
    const creditsWrapper = document.getElementById('credits_wrapper');
    if (!creditsWrapper) {
        return;
    }
    
    const fetchedCredits = await fetchCredits();
    if (fetchedCredits.length === 0) {
        console.error("Credits is empty");
        return;
    }

    const creditsByRole = getCreditsByRole(fetchedCredits);
    for (const [role, members] of Object.entries(creditsByRole)) {
        const roleDiv = createRoleDiv(role, members);
        creditsWrapper.append(roleDiv);
    }
}

async function fetchCredits() {
    const response = fetch(CREDITS_API_URL)
        .then(resp => {
            return resp.json()?.team??[];
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
        if (creditsByRole.hasOwnProperty(credit.name)) {
            creditsByRole[credit.name].push(credit.members);
        } else {
            creditsByRole[credit.name] = [credit.members];
        }
    });
    return creditsByRole;
}

function createRoleDiv(role, members) {
    const roleDiv = document.createElement('div');
    roleDiv.classList.add('role');

    const roleH2 = document.createElement('h2');
    roleH2.textContent = role;
    roleDiv.append(roleH2);

    members.forEach(member => {
        const personDiv = document.createElement('div');
        personDiv.classList.add('person');

        const personH3 = document.createElement('h3');
        personH3.textContent = `${member.firstName} "${member.username}" ${member.lastName} - ${member.countryCode}`;

        personDiv.append(personH3);
        roleDiv.append(personDiv);
    });

    return roleDiv;
}
