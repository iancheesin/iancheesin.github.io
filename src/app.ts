// import Sheet from 'google-apps-script'
 import firebase from "firebase/compat/app";
// import 'firebase/compat/auth';
// import "firebase/compat/database";
// import 'firebase/compat/firestore';

type SalesHoursObj = {
    'Date': string;
    'Historical Sales': number;
    'Prep Hours': number;
}

class PrepItem {
    itemName: string;
    batchUnitName: string;
    batchTimeMinutes: number;
    prepThisWeek: number;
    prepTomorrow: number;
    finishedItemBool: boolean; //true if this is a finished product
    totalBatchTime: number;
    ingredients: string[];

    constructor (itemName: string, batchUnitName: string, batchTimeMinutes: number, prepThisWeek: number, prepTomorrow: number, finishedItemBool: boolean, ingredients: string[]){
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.batchTimeMinutes = batchTimeMinutes;
        this.prepThisWeek = prepThisWeek;
        this.prepTomorrow = prepTomorrow;
        this.finishedItemBool = finishedItemBool;
        this.totalBatchTime = roundToNearestTenth(this.batchTimeMinutes * this.prepThisWeek);
        this.ingredients = ingredients;
    }
}

class Item {
    itemName: string;
    batchUnitName: string;
    finishedItemBool: boolean; //true if this is a finished product
    batchesPerSaleDollar: number;
    batchSize: number;
    batchTimeMinutes: number;
    ingredients: string[];
    
    constructor(itemName: string, batchUnitName: string, finishedItemBool: boolean, batchesPerSaleDollar: number, batchSize: number, batchTimeMinutes: number, ingredients: string[]) {
        this.itemName = itemName;
        this.batchUnitName = batchUnitName;
        this.finishedItemBool = finishedItemBool; 
        this.batchesPerSaleDollar = batchesPerSaleDollar;
        this.batchSize = batchSize;
        this.batchTimeMinutes = batchTimeMinutes;
        this.ingredients = ingredients;
    }
}

function roundToNearestTenth(number: number) {
  return Math.round(number * 10) / 10;
}

function getCookie(name:string){
    const cookieInfo = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
    return cookieInfo;
}

function parseCookie(cookie: string | undefined, cookieName: string){
    if (cookie){
        return JSON.parse(cookie);
    }else{
        console.log(`oh no, we didn't find that cookie! For cookie name ${cookieName}`);
    }
}

function midnight(){
    const now = new Date();
    now.setHours(23, 59, 59, 0);
    const midnight = now.toUTCString();
    return midnight;
}

function setInventoryCookie(newInventory: Record<string, number>, name:string){
    //this function will
    //1. delete the old inventory cookie, if it exists
    document.cookie=`${name}=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `${name}=${JSON.stringify(newInventory)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}

function setUserInfoCookie(form: HTMLFormElement){
    //this function will
    //1. delete the old user cookies, if it exists
    document.cookie="userName=;expires=Fri, 12 Jan 2018";
    document.cookie="location=;expires=Fri, 12 Jan 2018";
    //2. create new user cookies, which should never expire
    document.cookie = `userName=${form.nameInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
    document.cookie = `location=${form.locationInput.value};expires=Fri, 1 Jan 2100;Partitioned;SameSite=none; secure`;
}

function setPrepListCookie(prepList: PrepItem[], name:string){
    //this function will
    //1. delete the old cookie, if it exists
    document.cookie=`${name}=;expires=Fri, 12 Jan 2018`;
    //2. create a new cookie
    document.cookie = `${name}=${JSON.stringify(prepList)};expires=${midnight()};Partitioned;SameSite=none; secure`;
}

function getLocations(): string[]{
    const jsonStrLocations = '[ "Norcross", "Settlers Green", "The Commissary", "Portland", "Portsmouth", "Hub Hall", "Big Cheddah", "Monterey Jack", "Pepper Jack" ]';
    return JSON.parse(jsonStrLocations);
}

function userInfo(locations: string[], id: string){
    let completeHTML: string = '';
    let locationOptions: string = '';
    const nameLabel: string = `<label for="nameInput">First Name</label><br>`;
    const nameInput: string = '<input type="string" name="nameInput" id="nameInput"><br>';
    const locationLabel: string = '<label for=locationInput">Location</label><br>';
    locations.forEach ((location: string) => {
        const newOption: string = `<option value="${location}">${location}</option>`
        locationOptions += newOption;
    })
    const locationInput: string = `<select name="location" id="locationInput">${locationOptions}</select><br>`;
    completeHTML = `<h1>Input User Info.</h1><form id="userInfoForm">${nameLabel}${nameInput}${locationLabel}${locationInput}<input type="submit" value="Submit" class="center"></form>`
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("userInfo did not find an HTML element where one was expected");
    }
}

async function inventoryForm (id: string){
    let completeHTML: string = "";
    let items: Item[] = getItems();
    items.forEach ((Item) => {
        const label: string = `<label for="${Item.itemName}Input">${Item.batchUnitName}s of ${Item.itemName}</label><br>`;
        const input: string = `<input type="number" step="any" name="${Item.itemName}Input"><br>`;
        completeHTML += label + input;
    })
    completeHTML = `<h1>Input Inventory</h1><form id="inventoryForm">${completeHTML}<input type="submit" value="Submit" class="center"></form>`;
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("inventoryForm did not find an HTML element where one was expected");
    }
}

function makeHTMLPrepRows (prepList: PrepItem[], name: string, cookieName:string, completeHTML: string = ''){
    const progress: Record<string, number> = parseCookie(getCookie(cookieName),cookieName);
    prepList.forEach ((PrepItem) => {
        const row: string = `<tr><td>${PrepItem.itemName}</td><td>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td>${PrepItem.totalBatchTime} min</td><td><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></td></tr>`;
        completeHTML += row;
    })
    return completeHTML;
}

//TODO: As of 5/24 error with this functino and the progress array/cookie: It seems like the cookie is never created
function makeHTMLPrepRowsStrong (prepList: PrepItem[], name: string, cookieName:string, completeHTML: string = ''){
    if (getCookie(cookieName) !== undefined){
        console.log('the cookie exists!')
        const progress: Record<string, number> = parseCookie(getCookie(cookieName), cookieName);
        prepList.forEach ((PrepItem) => {
            let row: string = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="${progress[PrepItem.itemName]}"></strong></td></tr>`;
            completeHTML += row;
        })
    }else{
        console.log('the cookie doesnt exist!')
        prepList.forEach ((PrepItem) => {
            let row: string = `<tr><td><strong>${PrepItem.itemName}</strong></td><td><strong>${Math.ceil(PrepItem.prepTomorrow)}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</strong></td><td><strong>${PrepItem.totalBatchTime} min<strong></td><td><strong><input class="${name}PrepListInput" type="number" id="${name}PrepList${PrepItem.itemName}" value="0"></strong></td></tr>`;
            completeHTML += row;
        })
    }
    
    return completeHTML;
}

function makeFinalPrepList (completeHTML: string){
    completeHTML = `<h1>Final Prep List</h1>
                    <p>Items needed for tomorrow are in <strong>bold</strong>.</p>
                        <table id="finalPrepList" class="center">
                            <tr>
                                <th>Item</th>
                                <th>What's needed</th>
                                <th>Max time</th>
                                <th>Amount made</th>
                            </tr>
                            ${completeHTML}
                        </table>
                        <button type="button" id="submitButton" class="center">Finished!</button>
                        <p>(click for extra prep)</p>`;
    const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }
        else {
            console.log("finalPrepList did not find an HTML element where one was expected");
        }
}

function doneWithFinal(extraPrepList: PrepItem[]){
    const finalPrepProgressStr = getCookie('finalPrepProgress');
    const finalPrepProgress = JSON.parse(finalPrepProgressStr !== undefined ? finalPrepProgressStr : 'error');
    const location = getCookie('location');
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
    const user = getCookie('userName');
    
    let dbRef = firebase.database().ref(`/Prep Record/${todayStr}/${location}`);
    dbRef.set(finalPrepProgress);
    dbRef.update({'user': user});
    if (extraPrepList[0]){
        let completeHTML: string = "";
        extraPrepList.forEach ((PrepItem) => {
            let row: string = `<tr><td>${PrepItem.itemName}</td><td>${PrepItem.prepThisWeek}-${PrepItem.prepThisWeek} ${PrepItem.batchUnitName}s</td><td>${PrepItem.totalBatchTime} min</td><td><input class="extraPrepListInput" type="number" id="extraPrepList${PrepItem.itemName}"></td></tr>`;
            completeHTML += row;
        })
        completeHTML = `<h1>Extra Prep List</h1>
                        <table id="extraPrepList" class="center">
                            <tr>
                            <th>Item</th>
                            <th>Prep Amount</th>
                            <th>Prep Time</th>
                            <th>Prepped?</th>
                            </tr>
                            ${completeHTML}
                        </table>
                        <button type="button" id="submitButtonExtra" class="center">Finished!</button>
                        <p>(for real, this is all the prep)</p>`;
        const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }else {
            console.log("doneWithFinal did not find an HTML element where one was expected");
        }
        const submitButton = document.getElementById('submitButtonExtra');
        submitButton?.addEventListener('click', () => {
            const inputs = document.getElementsByClassName('extraPrepListInput') as HTMLCollectionOf<HTMLInputElement>; 
            var isUnfilled = false;
            for(let x = 0; x < inputs.length; x++) {
                if(inputs[x].type == 'number' && !inputs[x].value) {
                    isUnfilled = true;
                }
            }
            if(isUnfilled){
                alert('You have not completed this prep list! Prep all the items to finish prep.');
            }else{
                HtmlNothingToPrep();
            }
        })
    }else if(!extraPrepList[0]){
        HtmlNothingToPrep();
    }
}

function formDataToRecord(formData: FormData): Record<string, number> {
    const record: Record<string, number> = {};
    formData.forEach((value, key) => {
       record[String(key).split("Input")[0]] = Number(value);
    });
    return record;
}

function calcNeededTomorrow (item: Item, tomorrowSales: number, currentInventory: { [id: string]: number }): number /*returns batches needed tomorrow*/{
    let neededTomorrow = roundToNearestTenth((tomorrowSales * item.batchesPerSaleDollar * 1.25)-currentInventory[item.itemName]);
    return neededTomorrow;
}

function calcNeededThisWeek (item: Item, thisWeekSales: number, tomorrowSales:number, currentInventory: { [id: string]: number }): number /*returns batches needed this week*/{
    let neededThisWeek = Math.floor((thisWeekSales * item.batchesPerSaleDollar * 0.85)-currentInventory[item.itemName]);// this is floored because we are looking for an underestimate of whole batches to prep for next week, rather than what we will absolutely need for tomorrow (which is why calcNeededTomorrow isn't floored)
    if (neededThisWeek <= 0 && calcNeededTomorrow(item, tomorrowSales, currentInventory) > 0){
        neededThisWeek = 1;
    }
    return neededThisWeek;
}

//A priority level of 0 means not needed, 1 means needed this week but not ASAP, 2 means needed ASAP
function checkPriorityLevel (item: Item, thisWeekSales: number, tomorrowSales: number, currentInventory: { [id: string]: number }): number/*returns a prority level of 0 (does not need to be prepped at all), 1 (could be prepped for the week), or 2 (needs to be prepped for tomorrow)*/{
    const neededTomorrow: number = calcNeededTomorrow(item, tomorrowSales, currentInventory);
    const neededThisWeek: number = calcNeededThisWeek(item, thisWeekSales, tomorrowSales, currentInventory);
    if (neededTomorrow < 0 || neededTomorrow === 0) {
        if (neededThisWeek > 0){
            return 1;
        }
        else {
            return 0;
        }
    }
    else if (neededTomorrow > 0){
        return 2;
    }else{
        console.log("oh nooooooo -with love, checkPriorityLevel");
        return 0;
    }   
}

function HtmlNothingToPrep(){
    let completeHTML = '<h2>There is nothing to prep!</h2>'
        const body: HTMLElement | null = document.getElementById('body');
        if (body) {
            body.innerHTML = completeHTML;
        }
        else {
            console.log("HtmlNothingToPrep did not find an HTML element where one was expected");
        }
}

function sortPrepListByUi (highPriorityUnfinished: PrepItem[], highPriorityFinished: PrepItem[], prepList: PrepItem[], lowPrioritySelected: PrepItem[], extraPrep: PrepItem[], remainingPrepTime: number, id: string){
    //define the table
    let completeHTML: string = "";
    prepList.forEach ((PrepItem) => {
        let row: string = `<tr><td>${PrepItem.itemName}</td><td><input class="lowPriorityUiCheckbox" type="checkbox" id="lowPrioritySelectionTable${PrepItem.itemName}"></td><td>${PrepItem.totalBatchTime} min</td></tr>`;
        completeHTML += row;
    })
    completeHTML = `<h1>Select Additional Items to Prep</h1>
                    <h2 id="remainingPrepTime">Remaining Prep Time: ${remainingPrepTime} minutes</h2>
                    <table id="lowPrioritySelectionTable" class="center">
                        <tr>
                            <th>Item</th>
                            <th>Prep now?</th>
                            <th>Prep Time</th>
                        </tr>
                        ${completeHTML}
                    </table>
                    <button type="button" id="submitButton" class="center">Submit</button>`;
    const body: HTMLElement | null = document.getElementById(id);
    if (body) {
        body.innerHTML = completeHTML;
    }
    else {
        console.log("sortPrepListByUi did not find an HTML element where one was expected");
    }
    //make checkboxes change remaining prep time
    let displayPrepTime: number = remainingPrepTime;
    prepList.forEach((PrepItem) => {
        const checkbox = document.getElementById(`lowPrioritySelectionTable${PrepItem.itemName}`) as HTMLInputElement;
        checkbox.addEventListener('change', () => {
            const header = document.getElementById('remainingPrepTime');
            if(header){
                if(checkbox.checked){
                    displayPrepTime -= Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }else if(!checkbox.checked){
                    displayPrepTime += Number(PrepItem.totalBatchTime);
                    header.textContent = `Remaining Prep Time: ${displayPrepTime} minutes`;
                }
            } else {
                console.log('sortPrepListByUi did not identify the low priority selection table properly');
            }
        })
    })
    //make the submit button functional
    const submitButton = document.getElementById('submitButton');
    submitButton?.addEventListener('click', () => {
        if (displayPrepTime <= 0){
            //if prep time is equal to or less than 0, push checked items to shorterPrepList and unchecked items to extraPrepList
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox') as HTMLCollectionOf<HTMLInputElement>;
            for(let x = 0; x < checkboxes.length; x++) {
                if(checkboxes[x].type == 'checkbox') {
                    if (checkboxes[x].checked) {
                        lowPrioritySelected.push(prepList[x]);
                    } else if (!checkboxes[x].checked){
                        extraPrep.push(prepList[x]);
                    }
                }
            }
            displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
        }else if (displayPrepTime > 0){
            //if prep time is greater than 0, then check whether the user can check more items, if not push checked items to shorterPrepList and unchecked items to extraPrepList
            const checkboxes = document.getElementsByClassName('lowPriorityUiCheckbox') as HTMLCollectionOf<HTMLInputElement>;
            var isUnchecked = false;
            for(let x = 0; x < checkboxes.length; x++) {
                if(checkboxes[x].type == 'checkbox') {
                    isUnchecked = !checkboxes[x].checked;
                    if(isUnchecked) break;
                }
            }
            if(!isUnchecked){
                for(let x = 0; x < checkboxes.length; x++) {
                    if(checkboxes[x].type == 'checkbox') {
                        if (checkboxes[x].checked) {
                            lowPrioritySelected.push(prepList[x]);
                        } else if (!checkboxes[x].checked){
                            extraPrep.push(prepList[x]);
                        }
                    }
                }
                displayPrepLists(highPriorityUnfinished, highPriorityFinished, lowPrioritySelected, extraPrep);
            }else if(isUnchecked){
                alert('You have more prep time remaining, please select more items to prep!');
            }
        }
    })
}

function sortPrepListByFinished(prepList: PrepItem[]):[PrepItem[],PrepItem[]]{
    const unfinished: PrepItem[] = [];
    const finished: PrepItem[] = [];
    prepList.forEach((PrepItem) => {
        if(PrepItem.finishedItemBool === true){
            finished.push(PrepItem);
        }
        else{
            unfinished.push(PrepItem);
        }
    })
    return [unfinished, finished];
}

function makePrepList () /*[highPriorityUnfinished: PrepItem[], highPriorityFinished: PrepItem[], lowPrioritySelected: PrepItem[], extraPrep: PrepItem[]*//*should eventually return two json strings, one of the high priority list and the other of the low priority list, each list should have the itemName, prepQuantity, and batchUnitName*/{
    let highPriorityPrepTime = 0;
    let highPriority: PrepItem[] = [];
    let lowPriority: PrepItem[] = [];
    let dontPrep: PrepItem[] = [];
    let highPriorityUnfinished: PrepItem[] = [];
    let highPriorityFinished: PrepItem[] = [];
    let lowPrioritySelected: PrepItem[] = [];
    let extraPrep: PrepItem[] = [];
    let arrayOfItems: Item[] = getItems();
    let prepHours:number = getPrepHours();
    let prepMinutes:number = prepHours * 60;
    let thisWeekSales:number = getThisWeekSales();
    let tomorrowSales:number = getTomorrowSales();

    // const prepHours: number = getPrepHours();
    // const prepMinutes: number = prepHours * 60;
    // const thisWeekSales = getThisWeekSales();
    // const tomorrowSales = getTomorrowSales(getCookie('location'));
    const inventoryCookie = getCookie('inventory');
    const currentInventory: { [id: string]: number } = parseCookie(inventoryCookie,'inventory');
    //save prep list
    const location = getCookie('location');
    const user = getCookie('userName');
    const now = new Date();
    const nowStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    const dbRef = firebase.database().ref(`/Inventory Record/${nowStr}/${location}`);
    dbRef.set(currentInventory);
    dbRef.update({'user': user});

    arrayOfItems.forEach((Item) => {
        const newPrepItem = new PrepItem (Item.itemName,Item.batchUnitName,Item.batchTimeMinutes,calcNeededThisWeek(Item, thisWeekSales, tomorrowSales, currentInventory), calcNeededTomorrow(Item, tomorrowSales, currentInventory), Item.finishedItemBool, Item.ingredients);
        switch (checkPriorityLevel(Item, thisWeekSales, tomorrowSales, currentInventory)){
            case 2:
                highPriority.push(newPrepItem);
                break;
            case 1:
                lowPriority.push(newPrepItem);
                break;
            case 0:
                dontPrep.push(newPrepItem);
                break;
            default:
                dontPrep.push(newPrepItem);
                break;

        }
    })
    //adjust ingredient priority here
    dontPrep.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined){
            if(PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1){
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        dontPrep.push(ingredientItem);
                    }else{
                        let ingredientIndexLp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                        if(ingredientIndexLp > -1){
                            let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                            dontPrep.push(ingredientItem);
                        }else{}
                    }
                }) 
            }
        }else{}
    })
    lowPriority.forEach((PrepItem) => {
        if (PrepItem.finishedItemBool !== undefined){
            if (PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = highPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1){
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        lowPriority.push(ingredientItem);
                    }else{}
                }) 
            }else{}
        }else{}
    })
    highPriority.forEach((PrepItem) => { //check if the high priority items have ingredients that need making... may need fixing
        if (PrepItem.finishedItemBool !== undefined){
            if (PrepItem.ingredients !== undefined){
                PrepItem.ingredients.forEach((ingredient) => {
                    const ingredientIndexHp = lowPriority.findIndex(obj => obj.itemName === ingredient);
                    if (ingredientIndexHp > -1){
                        let ingredientItem = highPriority.splice(ingredientIndexHp, 1)[0];
                        console.log(`Adding ingredient to high priority list: ${ingredient}`);
                        highPriority.push(ingredientItem);
                    }else{
                        let ingredientIndexLp = dontPrep.findIndex(obj => obj.itemName === ingredient);
                        if(ingredientIndexLp > -1){
                            let ingredientItem = lowPriority.splice(ingredientIndexLp, 1)[0];
                            highPriority.push(ingredientItem);
                        }else{}
                    }
                }) 
            }else{}
        }else{}
    });
    highPriority.forEach((PrepItem) => {
        if(PrepItem !== undefined) {
            highPriorityPrepTime += PrepItem.totalBatchTime;
        }
    });

    let remainingPrepTime = prepMinutes - highPriorityPrepTime;
    highPriority.sort((a, b) => b.totalBatchTime - a.totalBatchTime); //sort highPriority by totalBatchTime in descending order
    [highPriorityUnfinished, highPriorityFinished] = sortPrepListByFinished(highPriority); //sort highPriority into finished and unfinished item lists
    if (remainingPrepTime > 0 && lowPriority[0]) {
        sortPrepListByUi(highPriorityUnfinished, highPriorityFinished, lowPriority, lowPrioritySelected, extraPrep, remainingPrepTime,"body");
    }else if (highPriorityFinished[0] || highPriorityUnfinished[0]){
        displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, lowPriority);
    }else{
        HtmlNothingToPrep();
    }
}

function displayPrepLists (/*prepLists: Array<PrepItem[]>, extraPrepList: PrepItem[] */highPriorityFinished: PrepItem[] = [], highPriorityUnfinished: PrepItem[], lowPrioritySelected: PrepItem[], extraPrepList: PrepItem[]){
    let completeHTML: string = "";
    let finalPrepList: PrepItem[] =[];
    //save preplists
    setPrepListCookie(highPriorityFinished,'hPF');
    setPrepListCookie(highPriorityUnfinished,'hPU');
    setPrepListCookie(lowPrioritySelected,'lPS');
    setPrepListCookie(extraPrepList, 'ePL');

    //NOTE from Ian 5/24: I changed the cookie string passed to the makeHTMLPrep functions from finalPrepProgress (which is unset at the first start of this function) to hPF, hPU, and lPS
    //add high priority prep lists with strong
    completeHTML += makeHTMLPrepRowsStrong(highPriorityUnfinished,'final', 'hPU');
    completeHTML += makeHTMLPrepRowsStrong(highPriorityFinished,'final', 'hPF');

    //add a separator between high and low priority prep lists
    const separator: string = `<tr class= "separator"><td></td><td></td><td></td><td></td></tr>`;
    completeHTML += separator;

    //add low priority prep list
    completeHTML += makeHTMLPrepRows(lowPrioritySelected,'final','lPS');

    //display page
    makeFinalPrepList(completeHTML);

    //make final prep list
    highPriorityFinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })
    highPriorityUnfinished.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })
    lowPrioritySelected.forEach((PrepItem) => {
        finalPrepList.push(PrepItem);
    })

    

    //create prep progress object
    const finalPrepProgress: Record<string, number> = {};
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`) as HTMLInputElement;
        finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
        setInventoryCookie(finalPrepProgress,'finalPrepProgress');
    })

    //save prep progress
    finalPrepList.forEach((PrepItem) => {
        const input = document.getElementById(`finalPrepList${PrepItem.itemName}`) as HTMLInputElement;
        input.addEventListener('input', () => {
            finalPrepProgress[PrepItem.itemName] = parseInt(input.value);
            setInventoryCookie(finalPrepProgress,'finalPrepProgress');
        })
    })

    //make the submit button work
    const submitButton = document.getElementById('submitButton');
    submitButton?.addEventListener('click', () => {
        const inputs = document.getElementsByClassName('finalPrepListInput') as HTMLCollectionOf<HTMLInputElement>; 
        var isUnfilled = false;
        for(let x = 0; x < inputs.length; x++) {
            if(inputs[x].type == 'number' && !inputs[x].value) {
                isUnfilled = true;
            }
        }
        if(!isUnfilled){
            //check if any inputs seem low or high
            let belowMin = false;
            let aboveMax = false;
            for(let x = 0; x < finalPrepList.length; x++) {
                if(finalPrepProgress[finalPrepList[x].itemName] < finalPrepList[x].prepTomorrow) {
                    belowMin = true;
                }
                console.log(finalPrepProgress[finalPrepList[x].itemName]);
                console.log(finalPrepList[x].prepTomorrow);
                console.log(finalPrepList[x].itemName);
                console.log(belowMin);
            }
            for(let x = 0; x < finalPrepList.length; x++) {
                if(finalPrepProgress[finalPrepList[x].itemName] > finalPrepList[x].prepThisWeek) {
                    aboveMax = true;
                }
            }
            if (!aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow. Are you sure you're done with this prep list?`)){
               doneWithFinal(extraPrepList);
               //TODO dummy function to save inputs permanently
            }else if (aboveMax && !belowMin && confirm(`At least one of your entries is above the amount needed for next week. Are you sure you entered the amount correctly?`)){
                doneWithFinal(extraPrepList);
            }else if (aboveMax && belowMin && confirm(`At least one of your entries is below the amount needed for tomorrow AND at least one of your entries is above the amount needed for next week. Are you sure you entered all the amounts correctly and you're done with this prep list?`)){
                doneWithFinal(extraPrepList);
            }else if (!aboveMax && !belowMin){
                doneWithFinal(extraPrepList);
            }

        }else if(isUnfilled){
            alert('You have not completed this prep list! Prep all the items to access the extra prep list.');
        }
    })
}

async function getItemJson(location: string = 'Norcross'): Promise<string> {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Item Lists').child(location).get().then( (snapshot) => {
        if (snapshot.exists()) {
            //console.log(JSON.stringify(snapshot.val()));
            jsonStrItems = JSON.stringify(snapshot.val());
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getItemJson: ${error}`);
    });
    return jsonStrItems;
}

async function getSalesHoursJson(location: string = 'Norcross'): Promise<string> {
    let dbRef = firebase.database().ref();
    let jsonStrItems = '';
    await dbRef.child('Sales and Hours').child(location).get().then( (snapshot) => {
        if (snapshot.exists()) {
            // console.log(`Sales & Hours JSON in getSalesHoursJson:`);
            // console.log(JSON.stringify(snapshot.val()));
            jsonStrItems = JSON.stringify(snapshot.val());
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.log(`Whoops! Error in getSalesHoursJson: ${error}`);
    });
    return jsonStrItems;
}

async function onSubmitUserInfo(){

    const form = document.getElementById('userInfoForm') as HTMLFormElement;
    let body = document.getElementById('body');
    if(form){
        await form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (form.nameInput.value){
                if (body !== null) {
                    body.innerHTML = `<p id="loading">Loading</p><div class="loader"></div>`;
                }
                setUserInfoCookie(form);
                const hPF = getCookie('hPF');
                const hPU = getCookie('hPU');
                const lPS = getCookie('lPS');
                const ePL = getCookie('ePL');

                const highPriorityFinished = parseCookie(hPF,'hPF');
                const highPriorityUnfinished = parseCookie(hPU,'hPU');
                const lowPrioritySelected = parseCookie(lPS,'lPS');
                const extraPrepList = parseCookie(ePL,'ePL');

                const inventoryCookie = getCookie('inventory');

                
                let dataString = await getFirebaseData(getCookie('location'));
                // console.log(`Data string:`);
                // console.log(dataString);
                // console.log(`Item JSON in onSubmitUserInfo: ${await getItemJson(getCookie('location'))}`);
                // console.log(`Sales & Hours JSON in onSubmitUserInfo: ${await getSalesHoursJson(getCookie('location'))}`);
                setSpreadsheetDataCookies(dataString);
                if (highPriorityFinished && confirm("A saved prep list was found. Do you want to use that preplist?")) {
                    displayPrepLists(highPriorityFinished, highPriorityUnfinished, lowPrioritySelected, extraPrepList);
                }
                else if (inventoryCookie && confirm("A previously submitted inventory was found. Do you want to use that inventory?")) {
                    makePrepList();
                }
                else {
                    inventoryForm('body');
                    onSubmitInventory();
                }
            }else if(!form.nameInput.value){
                alert('Please input your name');
            }else{
                console.log('oh nooo From: onSubmitUserInfo');
            }
        })
    }else{
        console.log('onSubmitUserInfo did not find a form');
    }
}

function onSubmitInventory(){
    const form = document.getElementById('inventoryForm') as HTMLFormElement;
    if(form){
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const inventory = formDataToRecord(formData);
            let negativeEntry = false;
            let seemsHigh = false;
            Object.entries(inventory).forEach((x: [string,number]) => {
                if(x[1] < 0){
                    negativeEntry = true;
                }
            })
            Object.entries(inventory).forEach((x: [string,number]) => {
                if(x[1] > 99){
                    seemsHigh = true;
                }
            })
            if (negativeEntry){
                alert('You cannot submit a negative value for inventory');
            }else if(!negativeEntry && seemsHigh){
                if(confirm('At least one of your entries seems a little high. Are you sure this inventory is correct?')){
                    setInventoryCookie(inventory, 'inventory');
                    makePrepList();
                }else{}
            }else if (!negativeEntry){
                setInventoryCookie(inventory, 'inventory');
                makePrepList();
            }
        })
    }
}

function getItems(locationStr: string = ''): Item[] {
    let itemArrStr = getCookie('itemArr');
    if(false) { console.log(locationStr); }
    if(itemArrStr === undefined) {
        return JSON.parse('error');
    } else {
        return JSON.parse(itemArrStr);
    }
}

function getPrepHours(locationStr: string = ''): number{
    // console.log(getCookie('todayPrepHours'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('todayPrepHours'));
}

function getTomorrowSales(locationStr: string = ''): number{ // TODO: Check if null/undefined and throw error
    // console.log(getCookie('tomorrowSales'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('tomorrowSales'));
}

function getThisWeekSales(locationStr: string = ''): number{
    // console.log(getCookie('thisWeekSales'));
    if(false) { console.log(locationStr); }
    return Number(getCookie('thisWeekSales'));
}

function setSpreadsheetDataCookies(data: string[]) {
    //TODO: rework this function to take in a record with labels for the array types to make it more robust
    
    // console.log("JSON string array passed to the cookie setter function:");
    // console.log(data);

    //Store full sales & hours data JSON
    //1. delete the old cookie, if it exists
    document.cookie=`salesHoursArr=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `salesHoursArr=${data[0]};expires=${midnight()};Partitioned;SameSite=none; secure`;
    //TODO: for some reason the sales hours array is saving as data[0] in the coookie...
    
    //store item JSON
    //1. delete the old cookie, if it exists
    document.cookie=`itemArr=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `itemArr=${data[1]};expires=${midnight()};Partitioned;SameSite=none; secure`;

    //store today prep hours data
    //1. delete the old cookie, if it exists
    document.cookie=`todayPrepHours=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `todayPrepHours=${data[2]};expires=${midnight()};Partitioned;SameSite=none; secure`;

    //store tomorrow sales data
    //1. delete the old cookie, if it exists
    document.cookie=`tomorrowSales=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `tomorrowSales=${data[3]};expires=${midnight()};Partitioned;SameSite=none; secure`;

    //store this week sales data
    //1. delete the old cookie, if it exists
    document.cookie=`thisWeekSales=;expires=Fri, 12 Jan 2018`;
    //2. create a new inventory cookie, which should be just one cookie storing a Record
    document.cookie = `thisWeekSales=${data[4]};expires=${midnight()};Partitioned;SameSite=none; secure`;

    if(false) {
        onLoad();
        // getSpreadsheetData();
    }
}

function onLoad(){
    const locations: string[] = getLocations();
    userInfo(locations, 'body');
    onSubmitUserInfo();
}

//**IMPORTANT** The following function(s) need(s) to be placed in the Code.gs file, not the JavaScript.html file
// function getJsonStringFromItemArr(data:any[][] | undefined): string {
//     //see https://stackoverflow.com/questions/47555347/creating-a-json-object-from-google-sheets
//   if(data === undefined) {
//     console.log(`Error with the data in getJsonArrayFromData being undefined`);
//     return '';
//   }
//   var obj:Record<string, Object> = {};
//   var result:Object[] = [];
//   var headers:any[] = data[0];
//   var cols:number = headers.length;
//   var row:any[];

//   for (var i = 1, l = data.length; i < l; i++)
//   {
//     // get a row to fill the object
//     row = data[i];
//     // clear object
//     obj = {};
//     for (var col = 0; col < cols; col++) 
//     {
//       // fill object with new values
//       if(row[col] === 'true' || row[col] === 'false') { //converts bools to Boolean
//         obj[headers[col]] = (row[col] === 'true');
//       } else if (String(row[col])[0] === '[') {
//         obj[headers[col]] = JSON.parse(row[col]); //keeps arrays as arrays
//       } else {
//         obj[headers[col]] = String(row[col]);
//       }

//     }
//     // add object in a final result
//     result.push(obj);  
//   }
//   console.log(result);
//   return JSON.stringify(result);
// }

// function getJsonStringFromSalesArr(data:any[][] | undefined): string {
//     if(data === undefined) {
//         console.log(`Error with the data in getJsonArrayFromData being undefined`);
//         return '';
//       }
//       var result:(string|number)[][] = [[]];
//       var headers:any[] = data[0];
//       var cols:number = headers.length;
//       var row:any[];
    
//       for (var i = 0, l = data.length; i < l; i++)
//       {
//         // get a row to fill the object
//         row = data[i];
//         result[i] = [];
//         for (var col = 0; col < cols; col++) 
//         {
//             if(!isNaN(Number(row[col])) && String(row[col]).trim() !== '') { //check if number
//                 result[i][col] = Number(row[col]);
//             } else {
//                 result[i][col] = String(row[col]);
//             }    
//         }
//       }
//       console.log(result);
//       return JSON.stringify(result);
// }

async function getFirebaseData(locationStr: string = ''): Promise<string[]> {
    const salesArr: SalesHoursObj[] | undefined = JSON.parse(await getSalesHoursJson());
    let thisWeekSalesArr: SalesHoursObj[] = [];
    let todayPrepHours: number;
    let tomorrowSales: number;
    let thisWeekSales: number = 0;

    //get prep hours
    const today: Date = new Date();
    const todayStr: string = `${today.getMonth()+1}-${today.getDate()}-${today.getFullYear()}`;
    let row: number = 0;
    
    //console.log(salesArr);

    if(salesArr === undefined) {
        console.log(`In getPrepHours; salesArr is undefined`);
        todayPrepHours = 8;
    }
    else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        console.log(`Todays date of ${todayStr} found at row ${row} with value ${salesArr[row]['Prep Hours']} hours`);
        if (locationStr){
            todayPrepHours = Number(salesArr[row]['Prep Hours']); 
        }else{
            console.log('Error in getSpreadsheetData with prep hours; default to 8');
            todayPrepHours = 8;
        }
    }
    //get tomorrow sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getTomorrowSales; salesArr is undefined`);
        tomorrowSales = 0;
    } else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        console.log(`Todays date of ${todayStr} found at row ${row} with value ${salesArr[row]['Historical Sales']} dollars`);
        if (locationStr){
            tomorrowSales = Number(salesArr[row]['Historical Sales'])+Number(salesArr[row+1]['Historical Sales']); 
            console.log(`Today and tomorrow sales calculated to be ${tomorrowSales}`);
        }else{
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 5000');
            tomorrowSales = 5000;
        }
    }
    
    //calculate this week sales
    row = 0;

    if(salesArr === undefined) {
        console.log(`In getThisWeekSales; salesArr is undefined`);
        thisWeekSales = 0;
    } else {
        while( String(salesArr[row]['Date']) !== todayStr && row < salesArr.length) {
            row++;
        }
        for(let i = 1; i <= 7; i++) {
            thisWeekSales += Number(salesArr[row+i]['Historical Sales']);
            thisWeekSalesArr[i-1] = salesArr[row+i];
        }
        console.log(`This week's sales calculated to be ${thisWeekSales}`);
        if (!locationStr){
            console.log('Error in getSpreadsheetData with tomorrow sales; default to 7000');
            thisWeekSales = 7000;
        }
    }

    return [JSON.stringify(thisWeekSalesArr), await getItemJson(), JSON.stringify(todayPrepHours), JSON.stringify(tomorrowSales), JSON.stringify(thisWeekSales),];

}

// function getSpreadsheetData(locationStr: string = ''): string[] {
//     //TODO: rework this function to output a record with labels for the strings to make it more robust
//     const salesArr: object[][] | undefined = SpreadsheetApp.openById('15CvkTxN6k4RjzjKpEqdXsGg68hhH7RXkY_JtqfMxvyQ').getSheetByName(locationStr+' Sales')?.getDataRange().getValues();
//     const itemArr: object[][] | undefined = SpreadsheetApp.openById('15CvkTxN6k4RjzjKpEqdXsGg68hhH7RXkY_JtqfMxvyQ')?.getSheetByName(locationStr+' Item List')?.getDataRange().getValues();
//     let todayPrepHours: number;
//     let tomorrowSales: number;
//     let thisWeekSales: number = 0;

//     //get prep hours
//     const today: Date = new Date();
//     const todayStr: string = `${today.getMonth()+1}/${today.getDate()}/${today.getFullYear()}`
//     let row: number = 0;
//     let hoursCol: number = 0;

//     if(salesArr === undefined) {
//         console.log(`In getPrepHours; salesArr is undefined`);
//         todayPrepHours = 8;
//     }
//     else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Prep Hours') {
//                 hoursCol = i;
//             }
//         }
//         while( String(salesArr[row][0]) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         console.log(`Todays date of ${todayStr} found at row ${row+1} with value ${salesArr[row][hoursCol]} hours`);
//         if (locationStr){
//             todayPrepHours = Number(salesArr[row][hoursCol]); 
//         }else{
//             console.log('Error in getSpreadsheetData with prep hours; default to 8');
//             todayPrepHours = 8;
//         }
//     }
//     //get tomorrow sales
//     row = 0;
//     let salesCol: number = 0;

//     if(salesArr === undefined) {
//         console.log(`In getTomorrowSales; salesArr is undefined`);
//         tomorrowSales = 0;
//     } else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Historical Sales') {
//                 salesCol = i;
//             }
//         }
//         while( (salesArr[row][0] as unknown as string) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         console.log(`Tomorrows date of ${salesArr[row+1][0]} found at row ${row+2} with value ${salesArr[row+1][salesCol]} sales`);
//         if (locationStr){
//             tomorrowSales = Number(salesArr[row+1][salesCol]); 
//         }else{
//             console.log('OH NOoOoO -yours truly, getTomorrowSales');
//             tomorrowSales = 0;
//         }
//     }
    
//     //calculate this week sales
//     row = 0;
//     salesCol = 0;

//     if(salesArr === undefined) {
//         console.log(`In getThisWeekSales; salesArr is undefined`);
//         thisWeekSales = 0;
//     } else {
//         for (let i = 0; i < salesArr[0].length; i++) {
//             if (String(salesArr[0][i]) === 'Historical Sales') {
//                 salesCol = i;
//             }
//         }
//         while( String(salesArr[row][0]) !== todayStr && row < salesArr.length) {
//             row++;
//         }
//         for(let i = 1; i <= 7; i++) {
//             thisWeekSales += Number(salesArr[row+i][salesCol]);
//         }
//         console.log(`Todays date of ${todayStr} found at row ${row+1} with value ${salesArr[row][salesCol]} sales`);
//         console.log(`This week's sales calcualted to be ${thisWeekSales}`);
//         if (!locationStr){
//             console.log('OH NOoOoO -yours truly, getTomorrowSales');
//             thisWeekSales = 0;
//         }
//     }

//     return [getJsonStringFromItemArr(itemArr), getJsonStringFromSalesArr(salesArr), JSON.stringify(todayPrepHours), JSON.stringify(tomorrowSales), JSON.stringify(thisWeekSales),];
// }