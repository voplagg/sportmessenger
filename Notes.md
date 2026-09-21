# Sport Messenger projekti kitsad kohad

## 1. Vestlus laeb kõik sõnumid korraga

**Fail:** `client/src/pages/Chat.jsx`
**Probleem:** Firestore päringus puudub `limit()`. Kui kanalis on 10 000 sõnumit, laetakse need kõik brauserisse ja rakendus muutub aeglaseks.
**Lahendus:** Lisasin `limit(50)` ja muutsin sorteerimise `desc`-ks, et laetaks viimased 50 sõnumit. Pärast laadimist kasutan `.reverse()`, et kuvada õiges järjekorras.

## 2. `JSON.parse` ilma vigade käsitlemiseta

**Fail:** `server/index.js` (endpoint `GET /api/presence/online`)
**Probleem:** `.map((v) => JSON.parse(v))` — kui üks kirje Redis'es on rikkis, kukub kogu endpoint 500 veaga. Kasutajad ei näe online-nimekirja.
**Lahendus:** Asendasin `.map()` tsükliga `for` ja lisasin iga `JSON.parse` ümber `try/catch`. Rikkis kirjed jäetakse vahele, ülejäänud laetakse korrektselt.

## 3. Tundlikud `console.log`-id produktsioonis

**Fail:** `server/index.js` (`authMiddleware`)
**Probleem:** Logid, mis sisaldavad `uid`-d, meetodit, teed ja tokeni pikkust, on nähtavad Renderi paneelis. See on potentsiaalne info ründajale ja logide reostamine.
**Lahendus:** Lisasin lipu `isDebug = process.env.NODE_ENV !== "production"` ja panin kõik tundlikud `console.log`-id `if (isDebug)` sisse. `console.error` plokis `catch` jäi alles — vead logitakse alati.

## 4. Redis'i vealogid reostavad väljundit

**Fail:** `server/redis.js`
**Probleem:** Iga Redis'i viga (näiteks ühenduse taastamisel) kirjutatakse `console.error`-iga koos täieliku stack-iga. Minutiga võib koguneda sadu ridu.
**Lahendus:** Lisasin loenduri `redisErrorCount`. Esimesed 3 viga logitakse täielikult, edasi iga 50. viga lühidalt. Pikaajalise tõrke korral on 1000 rea asemel logides ~10.

## 5. Sõnumi pikkusele pole piirangut

**Fail:** `client/src/pages/Chat.jsx`
**Probleem:** Sisendväljal puudub `maxLength`. Saata võib mitme MB suuruse sõnumi, mis koormab Firestore'i (tasustatakse mahu järgi) ja aeglustab laadimist kõigile.
**Lahendus:** Lisasin `<input>`-ile `maxLength={1000}`.

---

## Kokkuvõte

| Nr | Probleem | Fail | Commit |
|---|---|---|---|
| 1 | Lehekülgede kaupa laadimine | `client/src/pages/Chat.jsx` | `limit(50)` päringus |
| 2 | JSON.parse | `server/index.js` | `try/catch` tsüklis |
| 3 | Logid produktsioonis | `server/index.js` | `isDebug` lipp |
| 4 | Redis'i logid | `server/redis.js` | Vigade loendur |
| 5 | Sõnumi pikkus | `client/src/pages/Chat.jsx` | `maxLength={1000}` |