const API_KEY = "27e641927300c5d3cb58b2194b78f807"

const DAYS_OF_THE_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
let selectedCityText;
let selectedCity;
const getCities = async (searchtext) =>{
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchtext}&limit=5&appid=${API_KEY}`);
    return response.json()
}

const getCurrentWeatherData = async({lat,lon,name:city})=>{
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    const response =await fetch(url);
    return response.json()
}

const getHourlyForecast = async ({name:city})=>{
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const {main:{temp,temp_max,temp_min},dt,dt_txt,weather:[{description,icon}]} = forecast;
        return {temp,temp_max,temp_min,dt,dt_txt,description,icon}
    })
}

const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;
const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`
const loadCurrentForecast = ({name, main:{temp,temp_max,temp_min}, weather:[{description}]}) =>{
    // <h1>City Name</h1>
    // <p class="temp">Temp</p>
    // <p class="description">Description</p>
    // <p class="min-max-temp">High Low</p>
    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".min-max-temp").textContent = `High: ${formatTemperature(temp_max)} Low: ${formatTemperature(temp_min)}`

    
}


const loadHourlyForecast = ({main:{temp:tempNow},weather:[{icon:iconNow}]},hourlyForecast) =>{
    // console.log(hourlyForecast);
    const timeFormatter = Intl.DateTimeFormat("en",{hour12:true, hour:"numeric"})
    let dataFor12Hours = hourlyForecast.slice(2,14);
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createIconUrl(iconNow)}"/>
    <p class="hourly-temp">${formatTemperature(tempNow)}</p>
</article>`;

    for (let {temp,icon,dt_txt} of dataFor12Hours){
        innerHTMLString += `<article>
        <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createIconUrl(icon)}"/>
        <p class="hourly-temp">${formatTemperature(temp)}</p>
    </article>`
    }
    hourlyContainer.innerHTML = innerHTMLString;
}
const calculateDaywiseForecast = (hourlyForecast) => {
    let daywiseForecast = new Map();
    for (let forecast of hourlyForecast){
        const [date] = forecast.dt_txt.split(" ");
        const dayofTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
        // console.log(dayofTheWeek);
        if (daywiseForecast.has(dayofTheWeek)){
            let forecastForTheDay= daywiseForecast.get(dayofTheWeek);
            forecastForTheDay.push(forecast);
            daywiseForecast.set(dayofTheWeek,forecastForTheDay);
        }else{
            daywiseForecast.set(dayofTheWeek, [forecast]);
        }
    }
    // console.log(daywiseForecast);
    for (let [key,value] of daywiseForecast){
        let temp_min = Math.min(...Array.from(value, (val) => val.temp_min));
        let temp_max = Math.max(...Array.from(value, (val) => val.temp_max));

        daywiseForecast.set(key, {temp_min,temp_max, icon: value.find(v => v.icon ).icon})
    }
    // console.log(daywiseForecast);
    return daywiseForecast;
}
const loadFiveDayForecast = (hourlyForecast) => {
    const daywiseForecast = calculateDaywiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-container");
    let dayWiseInfo = "";
    
    Array.from(daywiseForecast).map(([day,{temp_max,temp_min,icon}],index)=>{
        if (index < 5){
            dayWiseInfo += `<article class="day-wise-forecast">
        <h3 class="day">${index===0? "today":day}</h3>
        <img class="icon" src="${createIconUrl(icon)}" alt="icon for the Forecast"/>
        <p class="min-temp">${formatTemperature(temp_min)}</p>
        <p class="max-temp">${formatTemperature(temp_max)}</p>
    </article>`
        }
    });

    container.innerHTML = dayWiseInfo;
}
const loadFeelsLike = ({main: {feels_like}}) => {
    let container = document.querySelector("#feels-like");
    container.querySelector("#feels-like-temp").textContent = formatTemperature(feels_like);
}

const loadHumidity = ({main: {humidity}}) => {
    let container = document.querySelector("#humidity");
    container.querySelector("#humidity-value").textContent = `${humidity}%`;
}

const loadForecastUsingGeo = () => {
    navigator.geolocation.getCurrentPosition(({coords})=>{
        const {latitude:lat,longitude:lon} = coords;
        selectedCity = {lat,lon};
        loadData()
    }, error => console.log(error))
}
const loadData =async () =>{
    const currentWeather = await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyForecast = await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather,hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
    setBackground(currentWeather);
}
function debounce(func){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this,args)
        }, 500);
    }
}

const onSearchChange = async (event) => {
    let {value} = event.target;
    // console.log("value",value);
    if(!value){
        selectedCity = null;
        selectedCityText = "";
    }
    if (value && (selectedCityText !== value)){
        const listofCities= await getCities(value);
        let options = "";
        for (let {lat, lon, name, state, country} of listofCities){
            options += `<option data-city-details='${JSON.stringify({lat,lon,name})}' value="${name},${state},${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options;
    }
    
    
}

const handleCitySelection = (event ) => {
    console.log("Selection done");
    selectedCityText = event.target.value;
    console.log(selectedCityText);
    let options = document.querySelectorAll("#cities > option");
    console.log(options);
    if (options?.length){
        let selectedOption = Array.from(options).find(opt => opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log({selectedCity});
        loadData();
    }
}

const debounceSearch = debounce((event) => onSearchChange(event));

const setBackground =( {weather:[{id}]}) =>{
    const back = document.getElementById("container");
    const blockback = document.querySelectorAll(".back");
    if (200<=id && id<250){
        cssString =`background-image: url("weather back/thunder.jpeg");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(244, 233, 233); `;
        blockstring = "background-color: rgb(52 51 103 / 50%);";
    }else if (300<=id && id<350){
        cssString =`background-image: url("weather back/drizzle.jpeg");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(11, 11, 11);`;
        blockstring = "background-color: rgb(185 192 193 / 50%);";
    }else if (500<=id && id<550){
        cssString =`background-image: url("weather back/rainy.jpeg");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(11, 11, 11);`;
        blockstring = "background-color: hsl(187deg 15% 70% / 40%);";
    }else if (600<=id && id<650){
        cssString =`background-image: url("weather back/snow.png");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(11, 11, 11);`;
        blockstring = "background-color: rgb(185 192 193 / 50%);";
    }else if (700<=id && id<800){
        cssString =`background-image: url("weather back/atmos.png");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(11, 11, 11);`;
        blockstring = "background-color: rgb(175 195 197 / 50%);";
    }else if (800<=id && id<810){
        cssString =`background-image: url("weather back/cloudy.jpeg");
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: rgb(11, 11, 11);`;
        blockstring = "background-color: hsl(185deg 30% 43% / 50%);";
    }
    back.style.cssText +=';'+ cssString; 
    for (let i=0;i<blockback.length;i++){
        blockback[i].style.cssText = blockstring;
    }
    
    
    
}
document.addEventListener("DOMContentLoaded", async ()=>{
    loadForecastUsingGeo();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input",debounceSearch );
    searchInput.addEventListener("change",handleCitySelection );
    

})