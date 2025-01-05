import { useState, useEffect, useRef } from 'react'
import tajweed, {Tajweed}  from 'tajweed';
import axios from 'axios';
import './App.css'
import './tajweed.css'  

const surahNumberStart = 2;
const amountSurat = surahNumberStart;
// const url = (surahNumber) => `/surat/surah-${surahNumber}.json`;
const url = (surahNumber) =>  `https://api.globalquran.com/surah/${surahNumber}/quran-tajweed`;
// const url = (surahNumber) =>  `http://api.alquran.cloud/v1/ruku/${surahNumber}/quran-tajweed`;

const parseTajweed = new Tajweed();

/**
  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
  * 
  * @param {String} text The text to be rendered.
  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
  * 
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  */
function getTextWidth(text, font) {
  // re-use canvas object for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

function getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';
  
  return `${fontWeight} ${fontSize} ${fontFamily}`;
}

function App() {
  const [ayat, setAyat] = useState([]);
  const [rows, setRows] = useState([]);
  const itemsRef = useRef([]);
  console.log('ayat', ayat);

  useEffect(() => {
    const timer = setTimeout(() => {
      itemsRef.current.map(ref => {
        const fontSize = getTextWidth(ref.innerText, getCanvasFont(ref));
        console.log('fontSize', ref, fontSize);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [ayat]);

  const fetchSurahs = async () => {
    try {
      for (let surahNumber = surahNumberStart; surahNumber <= amountSurat; surahNumber++) {
        const response = await axios.get(url(surahNumber));
        if (response.status === 200) {
          let responseData = response.data?.data?.ayahs || response.data?.quran['quran-tajweed'];
          if (typeof responseData === 'object' && responseData !== null) {
              responseData = Object.values(responseData);
          }
          responseData && setAyat(responseData);
        } else {
          console.error(`Failed to fetch Surah ${surahNumber}`);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };


  return (
      <>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <button onClick={fetchSurahs} style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Fetch Surahs
          </button>
        </div>
        <div style={{position: "absolute"}}>
            {ayat.map((ayah,index) => 
              <span 
                style={{
                  position: "absolute",
                  top: index * 36,
                  right: 20,
                  height: "auto",
                  width: "auto",
                  whiteSpace: "nowrap"
                }}
                ref={el => itemsRef.current[index] = el} 
                dangerouslySetInnerHTML={{__html:parseTajweed.parse(ayah.text || ayah.verse,true) }} 
                key={index}
              ></span>
            )}
          </div>
      </>
  )
}

export default App
