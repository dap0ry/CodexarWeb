/**
 * tutorial.js — Codexar Tutorial Engine
 * All lesson content (8 lessons × 5 languages) + navigation logic
 * Target audience: absolute beginners who have never programmed before
 */

'use strict';

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let currentLang   = 'python';
let currentLesson = 0;
const TOTAL_LESSONS = 8;

const LANG_DISPLAY = {
    python: 'Python',
    cpp:    'C++',
    java:   'Java',
    go:     'Go',
    csharp: 'C#',
};

// ─────────────────────────────────────────────
//  PROGRESS (localStorage)
// ─────────────────────────────────────────────
function progressKey() {
    return `tut_progress_${currentLang}`;
}
function getProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey())) || []; }
    catch { return []; }
}
function markComplete(index) {
    const p = getProgress();
    if (!p.includes(index)) p.push(index);
    localStorage.setItem(progressKey(), JSON.stringify(p));
    renderSidebar();
}
function isComplete(index) {
    return getProgress().includes(index);
}

// ─────────────────────────────────────────────
//  LESSON CONTENT DATA
// ─────────────────────────────────────────────

/**
 * Each lesson returns an HTML string.
 * The engine injects it into #tutMain.
 */
const LESSONS = {

    // ── Lesson 0: ¿Qué es programar? ──────────────────────────────────
    0: {
        title: '¿Qué es programar?',
        subtitle: 'Entiende de qué va esto antes de escribir una sola línea.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">La idea básica</div>
  <p class="lesson-text">
    Programar es <strong>darle instrucciones a un ordenador</strong> para que haga algo.
    El ordenador no piensa: ejecuta exactamente lo que le dices, en el orden que le dices, sin saltarse nada.
  </p>
  <div class="lesson-callout">
    <span class="callout-icon">💡</span>
    Imagina una receta de cocina. La receta no cocina sola: necesita a alguien que la lea y ejecute cada paso.
    El <strong>programa</strong> es la receta. El <strong>ordenador</strong> es el cocinero.
  </div>
  <p class="lesson-text">
    Para que el ordenador entienda las instrucciones necesitas hablar su idioma —
    un <strong>lenguaje de programación</strong>. Tú vas a aprender <em>${LANG_DISPLAY[lang]}</em>.
  </p>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">¿Por qué ${LANG_DISPLAY[lang]}?</div>
  ${WHY_LANG[lang]}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">El flujo de un programa</div>
  <p class="lesson-text">
    Todo programa sigue este ciclo básico:
  </p>
  <div class="lesson-callout">
    <strong>ENTRADA</strong> → el programa recibe datos (del teclado, de un archivo…)<br>
    <strong>PROCESO</strong> → hace cálculos o toma decisiones con esos datos<br>
    <strong>SALIDA</strong>  → muestra o guarda el resultado
  </div>
  <p class="lesson-text">
    En programación competitiva — el objetivo de Codexar — el juez automático te da una
    <strong>entrada</strong> concreta, tú procesas y devuelves la <strong>salida</strong> correcta.
    Más adelante lo verás en acción.
  </p>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(0, lang, [
    {
      q: '¿Qué es un programa?',
      opts: ['Una app de móvil', 'Un conjunto de instrucciones para el ordenador', 'Un tipo de virus', 'El sistema operativo'],
      correct: 1,
      feedback: '¡Exacto! Un programa es una serie de instrucciones que el ordenador ejecuta paso a paso.'
    }
  ])}
</div>
`
    },

    // ── Lesson 1: Hola Mundo ──────────────────────────────────────────
    1: {
        title: 'Hola Mundo',
        subtitle: 'Tu primera línea de código real.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">La tradición</div>
  <p class="lesson-text">
    En el mundo de la programación, el primer programa que escribe todo el mundo es el
    <strong>Hola Mundo</strong>: simplemente imprime ese texto en la pantalla.
    Es la forma de comprobar que todo funciona y que entiendes cómo mostrar información.
  </p>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">El código</div>
  ${codeBlock(lang, HELLO_CODE[lang])}
  <div class="output-block">
    <div class="output-label">SALIDA</div>
    <div class="output-text">Hola, mundo!</div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">¿Qué acabas de ver?</div>
  ${HELLO_EXPLAIN[lang]}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(1, lang, [
    {
      q: `En ${LANG_DISPLAY[lang]}, ¿qué instrucción se usa para mostrar texto en pantalla?`,
      opts: PRINT_QUIZ_OPTS[lang],
      correct: 0,
      feedback: PRINT_QUIZ_FEEDBACK[lang]
    }
  ])}
</div>
`
    },

    // ── Lesson 2: Variables y tipos ───────────────────────────────────
    2: {
        title: 'Variables y tipos',
        subtitle: 'Guarda información para usarla después.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">¿Qué es una variable?</div>
  <p class="lesson-text">
    Una <strong>variable</strong> es un espacio en la memoria del ordenador donde guardas un dato
    al que puedes ponerle un nombre y usarlo más tarde.
  </p>
  <div class="lesson-callout">
    <span class="callout-icon">📦</span>
    Piensa en una variable como una caja con una etiqueta.
    La etiqueta es el <strong>nombre</strong> y dentro de la caja va el <strong>valor</strong>.
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Tipos de datos básicos</div>
  ${TYPES_TABLE[lang]}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Declarar y usar variables</div>
  ${codeBlock(lang, VARS_CODE[lang])}
  <div class="output-block">
    <div class="output-label">SALIDA</div>
    <div class="output-text">${VARS_OUTPUT[lang]}</div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(2, lang, [
    {
      q: '¿Qué es una variable en programación?',
      opts: ['Una operación matemática', 'Un espacio en memoria con nombre para guardar un dato', 'El nombre del programa', 'Un bucle que cambia'],
      correct: 1,
      feedback: '¡Correcto! Una variable es como una caja con etiqueta donde guardas información que puedes usar después.'
    },
    {
      q: `En ${LANG_DISPLAY[lang]}, ¿cómo se llamaría el tipo de dato para guardar el número <span class="ic">3.14</span>?`,
      opts: FLOAT_TYPE_OPTS[lang],
      correct: 0,
      feedback: FLOAT_TYPE_FEEDBACK[lang]
    }
  ])}
</div>
`
    },

    // ── Lesson 3: Leer datos del usuario ─────────────────────────────
    3: {
        title: 'Leer datos del usuario',
        subtitle: 'Tu programa debe poder escuchar, no solo hablar.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">¿Por qué leer datos?</div>
  <p class="lesson-text">
    Un programa útil no siempre trabaja con los mismos valores.
    Necesita recibir información desde fuera —normalmente lo que escribe el usuario en el teclado—
    y <strong>guardarla en variables</strong> para procesarla.
  </p>
  <p class="lesson-text">
    En los jueces de programación competitiva, los datos de entrada llegan como texto por la <em>entrada estándar</em>
    (lo mismo que cuando escribes en la consola). Tu programa los lee, los procesa y devuelve la respuesta.
  </p>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Cómo leer un número</div>
  ${codeBlock(lang, INPUT_CODE[lang])}
  ${INPUT_EXPLAIN[lang]}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Leer dos números en la misma línea</div>
  <p class="lesson-text">En competición es muy común recibir varios números separados por espacio en una línea.</p>
  ${codeBlock(lang, INPUT_TWO_CODE[lang])}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(3, lang, INPUT_QUIZ[lang])}
</div>
`
    },

    // ── Lesson 4: Operaciones matemáticas ────────────────────────────
    4: {
        title: 'Operaciones matemáticas',
        subtitle: 'Suma, resta, multiplica, divide — y algo más.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">Operadores básicos</div>
  <p class="lesson-text">
    Los ordenadores son muy buenos haciendo cálculos. Estos son los operadores que usarás en casi todos los problemas:
  </p>
  <table class="var-table">
    <thead><tr><th>Operador</th><th>Nombre</th><th>Ejemplo</th><th>Resultado</th></tr></thead>
    <tbody>
      <tr><td class="op">+</td><td>Suma</td><td class="td-example">5 + 3</td><td>8</td></tr>
      <tr><td class="op">-</td><td>Resta</td><td class="td-example">10 - 4</td><td>6</td></tr>
      <tr><td class="op">*</td><td>Multiplicación</td><td class="td-example">6 * 7</td><td>42</td></tr>
      <tr><td class="op">/</td><td>División</td><td class="td-example">15 / 4</td><td>${lang === 'python' ? '3.75' : '3'}</td></tr>
      ${lang === 'python' ? '<tr><td class="op">//</td><td>División entera</td><td class="td-example">15 // 4</td><td>3</td></tr>' : ''}
      <tr><td class="op">%</td><td>Módulo (resto)</td><td class="td-example">17 % 5</td><td>2</td></tr>
      <tr><td class="op">${lang === 'python' ? '**' : (lang === 'java' || lang === 'csharp' ? 'Math.Pow' : 'int(math.Pow')}</td><td>Potencia</td><td class="td-example">2${lang === 'python' ? '**' : '^'}10</td><td>1024</td></tr>
    </tbody>
  </table>
  <div class="lesson-callout warn">
    <span class="callout-icon">⚠️</span>
    <strong>División entera vs decimal:</strong> en la mayoría de lenguajes, dividir dos enteros da un entero
    (se descarta la parte decimal). ${lang === 'python' ? 'En Python, <span class="ic">/</span> da decimal y <span class="ic">//</span> da entero.' : 'Ten cuidado: <span class="ic">7 / 2</span> es <span class="ic">3</span>, no <span class="ic">3.5</span>.'}
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Ejemplo práctico</div>
  ${codeBlock(lang, MATH_CODE[lang])}
  <div class="output-block">
    <div class="output-label">SALIDA</div>
    <div class="output-text">${MATH_OUTPUT[lang]}</div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(4, lang, MATH_QUIZ[lang])}
</div>
`
    },

    // ── Lesson 5: Condiciones if / else ───────────────────────────────
    5: {
        title: 'Condiciones if / else',
        subtitle: 'Enseña a tu programa a tomar decisiones.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">¿Qué es una condición?</div>
  <p class="lesson-text">
    Hasta ahora tu programa ejecuta instrucciones de arriba a abajo, siempre igual.
    Con <strong>if / else</strong> puedes decirle: <em>"si pasa X, haz esto; si no, haz aquello"</em>.
  </p>
  <div class="lesson-callout">
    <span class="callout-icon">🔀</span>
    <strong>if</strong> = <em>si</em> &nbsp;·&nbsp; <strong>else</strong> = <em>si no</em> &nbsp;·&nbsp; <strong>${lang === 'python' ? 'elif' : 'else if'}</strong> = <em>si no, y si además…</em>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Estructura básica</div>
  ${codeBlock(lang, IF_CODE[lang])}
  <div class="output-block">
    <div class="output-label">SALIDA (si el usuario escribe 18)</div>
    <div class="output-text">${IF_OUTPUT[lang]}</div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Operadores de comparación</div>
  <table class="var-table">
    <thead><tr><th>Operador</th><th>Significado</th><th>Ejemplo</th></tr></thead>
    <tbody>
      <tr><td class="op">==</td><td>Igual a</td><td class="td-example">a == b</td></tr>
      <tr><td class="op">!=</td><td>Distinto de</td><td class="td-example">a != b</td></tr>
      <tr><td class="op">&gt;</td><td>Mayor que</td><td class="td-example">a &gt; b</td></tr>
      <tr><td class="op">&lt;</td><td>Menor que</td><td class="td-example">a &lt; b</td></tr>
      <tr><td class="op">&gt;=</td><td>Mayor o igual</td><td class="td-example">a &gt;= b</td></tr>
      <tr><td class="op">&lt;=</td><td>Menor o igual</td><td class="td-example">a &lt;= b</td></tr>
    </tbody>
  </table>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(5, lang, IF_QUIZ[lang])}
</div>
`
    },

    // ── Lesson 6: Bucles for / while ──────────────────────────────────
    6: {
        title: 'Bucles for / while',
        subtitle: 'Repite acciones sin escribir el mismo código diez veces.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">¿Qué es un bucle?</div>
  <p class="lesson-text">
    Un <strong>bucle</strong> repite un bloque de código mientras se cumpla una condición
    (o un número fijo de veces). Sin bucles tendrías que copiar y pegar código —eso no escala.
  </p>
  <div class="lesson-callout">
    <strong>for</strong>  — ideal cuando <em>sabes cuántas veces</em> vas a repetir.<br>
    <strong>while</strong> — ideal cuando repites <em>mientras algo sea cierto</em> pero no sabes exactamente cuántas veces.
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Bucle for — contar del 1 al 5</div>
  ${codeBlock(lang, FOR_CODE[lang])}
  <div class="output-block">
    <div class="output-label">SALIDA</div>
    <div class="output-text">1\n2\n3\n4\n5</div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Bucle while — leer hasta 0</div>
  ${codeBlock(lang, WHILE_CODE[lang])}
  ${WHILE_EXPLAIN[lang]}
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Comprueba lo que sabes</div>
  ${quiz(6, lang, LOOP_QUIZ[lang])}
</div>
`
    },

    // ── Lesson 7: Tu primer reto competitivo ─────────────────────────
    7: {
        title: 'Tu primer reto',
        subtitle: 'Todos los conceptos juntos en un problema real.',
        build: (lang) => `
<div class="lesson-section">
  <div class="lesson-section-title">El problema</div>
  <div class="challenge-box">
    <div class="challenge-label">Primer reto competitivo</div>
    <div class="challenge-title">A + B Problem</div>
    <p class="challenge-statement">
      Dado dos enteros <strong>A</strong> y <strong>B</strong>, imprime su suma.<br>
      Es el problema más clásico de programación competitiva para empezar —
      sirve para verificar que sabes leer entrada y mostrar salida correctamente.
    </p>
    <div class="challenge-io">
      <div class="challenge-io-block">
        <div class="challenge-io-label">ENTRADA</div>
        <div class="challenge-io-text">3 7</div>
      </div>
      <div class="challenge-io-block">
        <div class="challenge-io-label">SALIDA</div>
        <div class="challenge-io-text">10</div>
      </div>
    </div>
    <div class="challenge-io">
      <div class="challenge-io-block">
        <div class="challenge-io-label">ENTRADA</div>
        <div class="challenge-io-text">-5 13</div>
      </div>
      <div class="challenge-io-block">
        <div class="challenge-io-label">SALIDA</div>
        <div class="challenge-io-text">8</div>
      </div>
    </div>
  </div>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">Solución en ${LANG_DISPLAY[lang]}</div>
  ${codeBlock(lang, AB_CODE[lang])}
  <p class="lesson-text">
    ${AB_EXPLAIN[lang]}
  </p>
</div>

<div class="lesson-section">
  <div class="lesson-section-title">¿Qué conceptos usamos?</div>
  <p class="lesson-text">
    ✅ <strong>Entrada</strong> — leíste dos enteros del teclado/juez.<br>
    ✅ <strong>Variables</strong> — los guardaste en <span class="ic">a</span> y <span class="ic">b</span>.<br>
    ✅ <strong>Operación matemática</strong> — calculaste <span class="ic">a + b</span>.<br>
    ✅ <strong>Salida</strong> — imprimiste el resultado.
  </p>
  <div class="lesson-callout">
    <span class="callout-icon">🏆</span>
    Has escrito tu primer programa de programación competitiva.
    El siguiente paso es ir a la sección <strong>Ejercicios</strong> en Codexar y resolver problemas reales.
  </div>
</div>

<div class="completion-banner">
  <div class="completion-icon">🎉</div>
  <div class="completion-title">¡Tutorial completado!</div>
  <p class="completion-text">
    Has aprendido los fundamentos de ${LANG_DISPLAY[lang]}.<br>
    Ahora ponlos en práctica con problemas reales.
  </p>
  <div class="completion-btns">
    <a href="Exercises.html" class="btn-completion primary">Ir a Ejercicios →</a>
    <a href="Home.html"       class="btn-completion secondary">Volver al Inicio</a>
  </div>
</div>
`
    }
};

// ─────────────────────────────────────────────
//  HELPERS — code block + quiz HTML builders
// ─────────────────────────────────────────────
function codeBlock(lang, code) {
    return `
<div class="code-block">
  <div class="code-header">
    <span class="code-lang-badge">${LANG_DISPLAY[lang]}</span>
    <div class="code-dots"><span class="d1"></span><span class="d2"></span><span class="d3"></span></div>
  </div>
  <pre class="code-body">${code}</pre>
</div>`;
}

let quizIdCounter = 0;
const _quizFeedbackMap = {};

function quiz(lessonIndex, lang, questions) {
    return questions.map((q) => {
        const id = `qz_${lessonIndex}_${quizIdCounter++}`;
        _quizFeedbackMap[id] = q.feedback;
        const opts = q.opts.map((opt, i) => {
            return `<button class="option-btn" data-qid="${id}" data-idx="${i}" onclick="handleAnswer('${id}', ${i}, ${q.correct}, this)">${opt}</button>`;
        }).join('');
        return `
<div class="practice-box" id="${id}_box">
  <div class="practice-label">Mini ejercicio</div>
  <p class="practice-question">${q.q}</p>
  <div class="practice-options" id="${id}_opts">${opts}</div>
  <div class="practice-feedback" id="${id}_fb"></div>
</div>`;
    }).join('');
}

// ─────────────────────────────────────────────
//  CONTENT DATA — per-language
// ─────────────────────────────────────────────

const WHY_LANG = {
    python: `<p class="lesson-text"><strong>Python</strong> es el lenguaje más fácil para empezar. Su sintaxis es casi como escribir en inglés, no necesitas indicar los tipos de tus variables y el código es muy corto. Es el lenguaje más popular para aprender y también se usa mucho en programación competitiva para prototipar soluciones rápido.</p>`,
    cpp:    `<p class="lesson-text"><strong>C++</strong> es el lenguaje rey en competición. Casi todos los competidores de alto nivel usan C++ porque es increíblemente rápido y tiene la librería estándar <span class="ic">STL</span> con estructuras de datos y algoritmos ya hechos. Requiere algo más de configuración al principio, pero vale la pena.</p>`,
    java:   `<p class="lesson-text"><strong>Java</strong> es un lenguaje muy popular en el mundo profesional y también en competición. Es más estricto que Python (tienes que declarar los tipos), lo que ayuda a evitar errores. Las plataformas de jueces como Codeforces y LeetCode lo soportan perfectamente.</p>`,
    go:     `<p class="lesson-text"><strong>Go</strong> (o Golang) es un lenguaje moderno creado por Google. Es rápido, simple y con muy buen soporte para concurrencia. Aunque no es tan común en competición como C++, su sintaxis limpia lo hace muy legible y es una excelente opción para aprender.</p>`,
    csharp: `<p class="lesson-text"><strong>C#</strong> es el lenguaje de Microsoft, muy usado en desarrollo de videojuegos (Unity) y aplicaciones empresariales. Tiene una sintaxis similar a Java pero con características más modernas. En programación competitiva también está bien soportado.</p>`,
};

// ── Hola Mundo ──
const HELLO_CODE = {
    python: `<span class="fn">print</span>(<span class="str">"Hola, mundo!"</span>)`,
    cpp:    `<span class="kw">#include</span> <span class="str">&lt;iostream&gt;</span>\n<span class="kw">using namespace</span> <span class="ty">std</span>;\n\n<span class="ty">int</span> <span class="fn">main</span>() {\n    cout &lt;&lt; <span class="str">"Hola, mundo!"</span> &lt;&lt; endl;\n    <span class="kw">return</span> <span class="num">0</span>;\n}`,
    java:   `<span class="kw">public class</span> <span class="ty">Main</span> {\n    <span class="kw">public static void</span> <span class="fn">main</span>(<span class="ty">String</span>[] args) {\n        System.out.<span class="fn">println</span>(<span class="str">"Hola, mundo!"</span>);\n    }\n}`,
    go:     `<span class="kw">package</span> main\n\n<span class="kw">import</span> <span class="str">"fmt"</span>\n\n<span class="kw">func</span> <span class="fn">main</span>() {\n    fmt.<span class="fn">Println</span>(<span class="str">"Hola, mundo!"</span>)\n}`,
    csharp: `<span class="kw">using</span> System;\n\n<span class="kw">class</span> <span class="ty">Program</span> {\n    <span class="kw">static void</span> <span class="fn">Main</span>() {\n        Console.<span class="fn">WriteLine</span>(<span class="str">"Hola, mundo!"</span>);\n    }\n}`,
};

const HELLO_EXPLAIN = {
    python: `<p class="lesson-text"><span class="ic">print()</span> es la función que muestra texto en pantalla. El texto va entre comillas <span class="ic">" "</span> porque es una <strong>cadena de texto</strong> (string). ¡Una sola línea y ya tienes tu primer programa!</p>`,
    cpp:    `<p class="lesson-text"><span class="ic">#include &lt;iostream&gt;</span> importa la librería de entrada/salida. <span class="ic">cout &lt;&lt;</span> manda texto a la pantalla, y <span class="ic">endl</span> añade un salto de línea. <span class="ic">main()</span> es la función que ejecuta el programa.</p>`,
    java:   `<p class="lesson-text">En Java todo va dentro de una <strong>clase</strong>. El método <span class="ic">main</span> es el punto de entrada. <span class="ic">System.out.println()</span> imprime texto y añade salto de línea automáticamente.</p>`,
    go:     `<p class="lesson-text"><span class="ic">package main</span> indica que este es el programa principal. <span class="ic">import "fmt"</span> importa el paquete de formato. <span class="ic">fmt.Println()</span> imprime con salto de línea.</p>`,
    csharp: `<p class="lesson-text"><span class="ic">using System</span> importa el namespace básico. <span class="ic">Console.WriteLine()</span> imprime texto con salto de línea. La clase y el método <span class="ic">Main</span> son obligatorios en C#.</p>`,
};

const PRINT_QUIZ_OPTS = {
    python: ['print()', 'console.log()', 'echo()', 'write()'],
    cpp:    ['cout <<', 'print()', 'console.log()', 'printf()'],
    java:   ['System.out.println()', 'print()', 'Console.WriteLine()', 'cout <<'],
    go:     ['fmt.Println()', 'print()', 'console.log()', 'System.out.println()'],
    csharp: ['Console.WriteLine()', 'print()', 'cout <<', 'fmt.Println()'],
};
const PRINT_QUIZ_FEEDBACK = {
    python: '¡Correcto! En Python se usa print() para mostrar texto. Es una de las funciones más usadas.',
    cpp:    '¡Correcto! cout << es el operador de salida estándar en C++.',
    java:   '¡Correcto! System.out.println() es la forma estándar de imprimir en Java.',
    go:     '¡Correcto! fmt.Println() es la función de impresión más usada en Go.',
    csharp: '¡Correcto! Console.WriteLine() es el método estándar de salida en C#.',
};

// ── Variables y tipos ──
const TYPES_TABLE = {
    python: `<table class="var-table">
  <thead><tr><th>Tipo</th><th>Python</th><th>Ejemplo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td class="td-type">Entero</td><td class="ic">int</td><td class="td-example">42</td><td class="td-desc">Números sin decimales</td></tr>
    <tr><td class="td-type">Decimal</td><td class="ic">float</td><td class="td-example">3.14</td><td class="td-desc">Números con decimales</td></tr>
    <tr><td class="td-type">Texto</td><td class="ic">str</td><td class="td-example">"hola"</td><td class="td-desc">Cadena de caracteres</td></tr>
    <tr><td class="td-type">Booleano</td><td class="ic">bool</td><td class="td-example">True / False</td><td class="td-desc">Solo verdadero o falso</td></tr>
  </tbody>
</table>
<p class="lesson-text">Python detecta el tipo automáticamente — no tienes que declararlo explícitamente.</p>`,

    cpp: `<table class="var-table">
  <thead><tr><th>Tipo</th><th>C++</th><th>Ejemplo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td class="td-type">Entero</td><td class="ic">int</td><td class="td-example">42</td><td class="td-desc">Números sin decimales (±2 mil millones)</td></tr>
    <tr><td class="td-type">Entero grande</td><td class="ic">long long</td><td class="td-example">9999999999LL</td><td class="td-desc">Para números muy grandes</td></tr>
    <tr><td class="td-type">Decimal</td><td class="ic">double</td><td class="td-example">3.14</td><td class="td-desc">Número de punto flotante</td></tr>
    <tr><td class="td-type">Carácter</td><td class="ic">char</td><td class="td-example">'a'</td><td class="td-desc">Un solo carácter</td></tr>
    <tr><td class="td-type">Texto</td><td class="ic">string</td><td class="td-example">"hola"</td><td class="td-desc">Cadena de caracteres</td></tr>
    <tr><td class="td-type">Booleano</td><td class="ic">bool</td><td class="td-example">true / false</td><td class="td-desc">Solo verdadero o falso</td></tr>
  </tbody>
</table>`,

    java: `<table class="var-table">
  <thead><tr><th>Tipo</th><th>Java</th><th>Ejemplo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td class="td-type">Entero</td><td class="ic">int</td><td class="td-example">42</td><td class="td-desc">Números sin decimales</td></tr>
    <tr><td class="td-type">Entero grande</td><td class="ic">long</td><td class="td-example">9999999999L</td><td class="td-desc">Para números muy grandes</td></tr>
    <tr><td class="td-type">Decimal</td><td class="ic">double</td><td class="td-example">3.14</td><td class="td-desc">Número de punto flotante</td></tr>
    <tr><td class="td-type">Carácter</td><td class="ic">char</td><td class="td-example">'a'</td><td class="td-desc">Un solo carácter</td></tr>
    <tr><td class="td-type">Texto</td><td class="ic">String</td><td class="td-example">"hola"</td><td class="td-desc">Cadena de caracteres</td></tr>
    <tr><td class="td-type">Booleano</td><td class="ic">boolean</td><td class="td-example">true / false</td><td class="td-desc">Solo verdadero o falso</td></tr>
  </tbody>
</table>`,

    go: `<table class="var-table">
  <thead><tr><th>Tipo</th><th>Go</th><th>Ejemplo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td class="td-type">Entero</td><td class="ic">int</td><td class="td-example">42</td><td class="td-desc">Números sin decimales</td></tr>
    <tr><td class="td-type">Entero 64</td><td class="ic">int64</td><td class="td-example">9999999999</td><td class="td-desc">Para números muy grandes</td></tr>
    <tr><td class="td-type">Decimal</td><td class="ic">float64</td><td class="td-example">3.14</td><td class="td-desc">Número de punto flotante</td></tr>
    <tr><td class="td-type">Texto</td><td class="ic">string</td><td class="td-example">"hola"</td><td class="td-desc">Cadena de caracteres</td></tr>
    <tr><td class="td-type">Booleano</td><td class="ic">bool</td><td class="td-example">true / false</td><td class="td-desc">Solo verdadero o falso</td></tr>
  </tbody>
</table>`,

    csharp: `<table class="var-table">
  <thead><tr><th>Tipo</th><th>C#</th><th>Ejemplo</th><th>Descripción</th></tr></thead>
  <tbody>
    <tr><td class="td-type">Entero</td><td class="ic">int</td><td class="td-example">42</td><td class="td-desc">Números sin decimales</td></tr>
    <tr><td class="td-type">Entero grande</td><td class="ic">long</td><td class="td-example">9999999999L</td><td class="td-desc">Para números muy grandes</td></tr>
    <tr><td class="td-type">Decimal</td><td class="ic">double</td><td class="td-example">3.14</td><td class="td-desc">Número de punto flotante</td></tr>
    <tr><td class="td-type">Texto</td><td class="ic">string</td><td class="td-example">"hola"</td><td class="td-desc">Cadena de caracteres</td></tr>
    <tr><td class="td-type">Booleano</td><td class="ic">bool</td><td class="td-example">true / false</td><td class="td-desc">Solo verdadero o falso</td></tr>
  </tbody>
</table>`,
};

const VARS_CODE = {
    python: `edad = <span class="num">20</span>\nnombre = <span class="str">"Ana"</span>\naltura = <span class="num">1.70</span>\nestudiante = <span class="kw">True</span>\n\n<span class="fn">print</span>(nombre, <span class="str">"tiene"</span>, edad, <span class="str">"años"</span>)\n<span class="fn">print</span>(<span class="str">"Altura:"</span>, altura)`,
    cpp:    `<span class="ty">int</span> edad = <span class="num">20</span>;\n<span class="ty">string</span> nombre = <span class="str">"Ana"</span>;\n<span class="ty">double</span> altura = <span class="num">1.70</span>;\n<span class="ty">bool</span> estudiante = <span class="kw">true</span>;\n\ncout &lt;&lt; nombre &lt;&lt; <span class="str">" tiene "</span> &lt;&lt; edad &lt;&lt; <span class="str">" años"</span> &lt;&lt; endl;\ncout &lt;&lt; <span class="str">"Altura: "</span> &lt;&lt; altura &lt;&lt; endl;`,
    java:   `<span class="ty">int</span> edad = <span class="num">20</span>;\n<span class="ty">String</span> nombre = <span class="str">"Ana"</span>;\n<span class="ty">double</span> altura = <span class="num">1.70</span>;\n<span class="ty">boolean</span> estudiante = <span class="kw">true</span>;\n\nSystem.out.<span class="fn">println</span>(nombre + <span class="str">" tiene "</span> + edad + <span class="str">" años"</span>);\nSystem.out.<span class="fn">println</span>(<span class="str">"Altura: "</span> + altura);`,
    go:     `edad := <span class="num">20</span>\nnombre := <span class="str">"Ana"</span>\naltura := <span class="num">1.70</span>\nestudiante := <span class="kw">true</span>\n\nfmt.<span class="fn">Println</span>(nombre, <span class="str">"tiene"</span>, edad, <span class="str">"años"</span>)\nfmt.<span class="fn">Println</span>(<span class="str">"Altura:"</span>, altura)\n_ = estudiante <span class="cm">// Go no permite variables sin usar</span>`,
    csharp: `<span class="ty">int</span> edad = <span class="num">20</span>;\n<span class="ty">string</span> nombre = <span class="str">"Ana"</span>;\n<span class="ty">double</span> altura = <span class="num">1.70</span>;\n<span class="ty">bool</span> estudiante = <span class="kw">true</span>;\n\nConsole.<span class="fn">WriteLine</span>(nombre + <span class="str">" tiene "</span> + edad + <span class="str">" años"</span>);\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Altura: "</span> + altura);`,
};
const VARS_OUTPUT = {
    python: 'Ana tiene 20 años\nAltura: 1.7',
    cpp:    'Ana tiene 20 años\nAltura: 1.7',
    java:   'Ana tiene 20 años\nAltura: 1.7',
    go:     'Ana tiene 20 años\nAltura: 1.7',
    csharp: 'Ana tiene 20 años\nAltura: 1.7',
};
const FLOAT_TYPE_OPTS = {
    python: ['float', 'int', 'decimal', 'number'],
    cpp:    ['double', 'int', 'long long', 'char'],
    java:   ['double', 'int', 'long', 'Float'],
    go:     ['float64', 'int', 'int64', 'decimal'],
    csharp: ['double', 'int', 'long', 'decimal'],
};
const FLOAT_TYPE_FEEDBACK = {
    python: '¡Correcto! En Python, los números con decimales son de tipo float.',
    cpp:    '¡Correcto! En C++, double es el tipo más usado para números con decimales.',
    java:   '¡Correcto! En Java, double es el tipo más usado para números con decimales.',
    go:     '¡Correcto! En Go, float64 es el tipo estándar para números con decimales.',
    csharp: '¡Correcto! En C#, double es el tipo más usado para números con decimales. (decimal existe pero es para cálculos financieros)',
};

// ── Input ──
const INPUT_CODE = {
    python: `<span class="fn">print</span>(<span class="str">"Escribe tu edad: "</span>, end=<span class="str">""</span>)\nedad = <span class="ty">int</span>(<span class="fn">input</span>())\n<span class="fn">print</span>(<span class="str">"Tienes"</span>, edad, <span class="str">"años"</span>)`,
    cpp:    `<span class="ty">int</span> edad;\ncout &lt;&lt; <span class="str">"Escribe tu edad: "</span>;\ncin &gt;&gt; edad;\ncout &lt;&lt; <span class="str">"Tienes "</span> &lt;&lt; edad &lt;&lt; <span class="str">" años"</span> &lt;&lt; endl;`,
    java:   `<span class="ty">Scanner</span> sc = <span class="kw">new</span> <span class="ty">Scanner</span>(System.in);\nSystem.out.<span class="fn">print</span>(<span class="str">"Escribe tu edad: "</span>);\n<span class="ty">int</span> edad = sc.<span class="fn">nextInt</span>();\nSystem.out.<span class="fn">println</span>(<span class="str">"Tienes "</span> + edad + <span class="str">" años"</span>);`,
    go:     `<span class="kw">var</span> edad <span class="ty">int</span>\nfmt.<span class="fn">Print</span>(<span class="str">"Escribe tu edad: "</span>)\nfmt.<span class="fn">Scan</span>(&amp;edad)\nfmt.<span class="fn">Println</span>(<span class="str">"Tienes"</span>, edad, <span class="str">"años"</span>)`,
    csharp: `Console.<span class="fn">Write</span>(<span class="str">"Escribe tu edad: "</span>);\n<span class="ty">int</span> edad = <span class="ty">int</span>.<span class="fn">Parse</span>(Console.<span class="fn">ReadLine</span>());\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Tienes "</span> + edad + <span class="str">" años"</span>);`,
};
const INPUT_EXPLAIN = {
    python: `<p class="lesson-text"><span class="ic">input()</span> siempre devuelve texto (string). Como queremos un número, lo envolvemos en <span class="ic">int()</span> para convertirlo. Esto es fundamental: cuando el juez te manda números, son texto hasta que los conviertes.</p>`,
    cpp:    `<p class="lesson-text"><span class="ic">cin &gt;&gt;</span> lee el siguiente dato del teclado y lo guarda en la variable. C++ detecta el tipo automáticamente según la variable donde guardas el dato — si es <span class="ic">int</span>, lee un entero.</p>`,
    java:   `<p class="lesson-text">En Java necesitas un <span class="ic">Scanner</span> para leer entradas. <span class="ic">sc.nextInt()</span> lee el siguiente entero. Para texto usa <span class="ic">sc.next()</span>, para una línea entera <span class="ic">sc.nextLine()</span>.</p>`,
    go:     `<p class="lesson-text"><span class="ic">fmt.Scan()</span> lee datos de la entrada estándar. El <span class="ic">&amp;</span> delante de la variable es un <em>puntero</em> — Scan necesita la dirección de la variable para poder escribir en ella. Por ahora acéptalo como la sintaxis correcta.</p>`,
    csharp: `<p class="lesson-text"><span class="ic">Console.ReadLine()</span> lee una línea entera como texto. Para convertirla a número usamos <span class="ic">int.Parse()</span>. Si el texto no es un número válido, el programa lanzará un error.</p>`,
};

const INPUT_TWO_CODE = {
    python: `a, b = <span class="ty">map</span>(<span class="ty">int</span>, <span class="fn">input</span>().<span class="fn">split</span>())\n<span class="fn">print</span>(<span class="str">"Suma:"</span>, a + b)`,
    cpp:    `<span class="ty">int</span> a, b;\ncin &gt;&gt; a &gt;&gt; b;\ncout &lt;&lt; <span class="str">"Suma: "</span> &lt;&lt; a + b &lt;&lt; endl;`,
    java:   `<span class="ty">int</span> a = sc.<span class="fn">nextInt</span>();\n<span class="ty">int</span> b = sc.<span class="fn">nextInt</span>();\nSystem.out.<span class="fn">println</span>(<span class="str">"Suma: "</span> + (a + b));`,
    go:     `<span class="kw">var</span> a, b <span class="ty">int</span>\nfmt.<span class="fn">Scan</span>(&amp;a, &amp;b)\nfmt.<span class="fn">Println</span>(<span class="str">"Suma:"</span>, a+b)`,
    csharp: `<span class="ty">string</span>[] partes = Console.<span class="fn">ReadLine</span>().<span class="fn">Split</span>();\n<span class="ty">int</span> a = <span class="ty">int</span>.<span class="fn">Parse</span>(partes[<span class="num">0</span>]);\n<span class="ty">int</span> b = <span class="ty">int</span>.<span class="fn">Parse</span>(partes[<span class="num">1</span>]);\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Suma: "</span> + (a + b));`,
};

const INPUT_QUIZ = {
    python: [{
        q: 'Si el usuario escribe <span class="ic">42</span> y lo lees con <span class="ic">input()</span>, ¿qué tipo de dato obtienes?',
        opts: ['str (texto)', 'int (entero)', 'float (decimal)', 'bool'],
        correct: 0,
        feedback: '¡Correcto! input() siempre devuelve un string. Para convertirlo a entero hay que usar int().'
    }],
    cpp: [{
        q: '¿Qué instrucción se usa en C++ para leer un dato del teclado?',
        opts: ['cin >>', 'cout <<', 'scanf()', 'read()'],
        correct: 0,
        feedback: '¡Correcto! cin >> es el operador de entrada estándar en C++.'
    }],
    java: [{
        q: '¿Qué objeto se usa en Java para leer datos de la consola?',
        opts: ['Scanner', 'Reader', 'Input', 'Console'],
        correct: 0,
        feedback: '¡Correcto! Scanner (del paquete java.util) es la forma más común de leer datos en Java.'
    }],
    go: [{
        q: '¿Qué función se usa en Go para leer datos de la entrada estándar?',
        opts: ['fmt.Scan()', 'fmt.Println()', 'os.Read()', 'input()'],
        correct: 0,
        feedback: '¡Correcto! fmt.Scan() lee datos de la entrada estándar en Go.'
    }],
    csharp: [{
        q: '¿Qué método lee una línea entera del usuario en C#?',
        opts: ['Console.ReadLine()', 'Console.Read()', 'Console.WriteLine()', 'Console.Input()'],
        correct: 0,
        feedback: '¡Correcto! Console.ReadLine() lee toda la línea que escribe el usuario y la devuelve como string.'
    }],
};

// ── Math ──
const MATH_CODE = {
    python: `a = <span class="num">17</span>\nb = <span class="num">5</span>\n\n<span class="fn">print</span>(<span class="str">"Suma:"</span>, a + b)\n<span class="fn">print</span>(<span class="str">"Resta:"</span>, a - b)\n<span class="fn">print</span>(<span class="str">"Multiplicación:"</span>, a * b)\n<span class="fn">print</span>(<span class="str">"División:"</span>, a / b)\n<span class="fn">print</span>(<span class="str">"División entera:"</span>, a // b)\n<span class="fn">print</span>(<span class="str">"Módulo (resto):"</span>, a % b)`,
    cpp:    `<span class="ty">int</span> a = <span class="num">17</span>, b = <span class="num">5</span>;\ncout &lt;&lt; <span class="str">"Suma: "</span>           &lt;&lt; a + b &lt;&lt; endl;\ncout &lt;&lt; <span class="str">"Resta: "</span>          &lt;&lt; a - b &lt;&lt; endl;\ncout &lt;&lt; <span class="str">"Multiplicación: "</span> &lt;&lt; a * b &lt;&lt; endl;\ncout &lt;&lt; <span class="str">"División entera: "</span>&lt;&lt; a / b &lt;&lt; endl;\ncout &lt;&lt; <span class="str">"Módulo (resto): "</span> &lt;&lt; a % b &lt;&lt; endl;`,
    java:   `<span class="ty">int</span> a = <span class="num">17</span>, b = <span class="num">5</span>;\nSystem.out.<span class="fn">println</span>(<span class="str">"Suma: "</span>           + (a + b));\nSystem.out.<span class="fn">println</span>(<span class="str">"Resta: "</span>          + (a - b));\nSystem.out.<span class="fn">println</span>(<span class="str">"Multiplicación: "</span> + (a * b));\nSystem.out.<span class="fn">println</span>(<span class="str">"División entera: "</span>+ (a / b));\nSystem.out.<span class="fn">println</span>(<span class="str">"Módulo (resto): "</span> + (a % b));`,
    go:     `a, b := <span class="num">17</span>, <span class="num">5</span>\nfmt.<span class="fn">Println</span>(<span class="str">"Suma:"</span>, a+b)\nfmt.<span class="fn">Println</span>(<span class="str">"Resta:"</span>, a-b)\nfmt.<span class="fn">Println</span>(<span class="str">"Multiplicación:"</span>, a*b)\nfmt.<span class="fn">Println</span>(<span class="str">"División entera:"</span>, a/b)\nfmt.<span class="fn">Println</span>(<span class="str">"Módulo (resto):"</span>, a%b)`,
    csharp: `<span class="ty">int</span> a = <span class="num">17</span>, b = <span class="num">5</span>;\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Suma: "</span>           + (a + b));\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Resta: "</span>          + (a - b));\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Multiplicación: "</span> + (a * b));\nConsole.<span class="fn">WriteLine</span>(<span class="str">"División entera: "</span>+ (a / b));\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Módulo (resto): "</span> + (a % b));`,
};
const MATH_OUTPUT = {
    python: 'Suma: 22\nResta: 12\nMultiplicación: 85\nDivisión: 3.4\nDivisión entera: 3\nMódulo (resto): 2',
    cpp:    'Suma: 22\nResta: 12\nMultiplicación: 85\nDivisión entera: 3\nMódulo (resto): 2',
    java:   'Suma: 22\nResta: 12\nMultiplicación: 85\nDivisión entera: 3\nMódulo (resto): 2',
    go:     'Suma: 22\nResta: 12\nMultiplicación: 85\nDivisión entera: 3\nMódulo (resto): 2',
    csharp: 'Suma: 22\nResta: 12\nMultiplicación: 85\nDivisión entera: 3\nMódulo (resto): 2',
};
const MATH_QUIZ = {
    python: [{ q: '¿Cuánto vale <span class="ic">13 % 4</span>?', opts: ['1', '3', '4', '0'], correct: 1, feedback: '¡Correcto! 13 = 4×3 + 1, así que 13 % 4 = 1. Espera... 4×3=12, 13-12=1. ¡Sí, es 1!' }],
    cpp:    [{ q: '¿Cuánto vale <span class="ic">13 % 4</span>?', opts: ['1', '3', '4', '0'], correct: 0, feedback: '¡Correcto! 13 = 4×3 + 1, así que el resto es 1.' }],
    java:   [{ q: '¿Cuánto vale <span class="ic">13 % 4</span>?', opts: ['1', '3', '4', '0'], correct: 0, feedback: '¡Correcto! El operador % da el resto de la división. 13 = 4×3 + 1, resto = 1.' }],
    go:     [{ q: '¿Cuánto vale <span class="ic">13 % 4</span>?', opts: ['1', '3', '4', '0'], correct: 0, feedback: '¡Correcto! 13 dividido entre 4 es 3 con resto 1.' }],
    csharp: [{ q: '¿Cuánto vale <span class="ic">13 % 4</span>?', opts: ['1', '3', '4', '0'], correct: 0, feedback: '¡Correcto! El módulo (%) da el resto de dividir 13 entre 4: es 1.' }],
};

// ── If/else ──
const IF_CODE = {
    python: `edad = <span class="ty">int</span>(<span class="fn">input</span>())\n\n<span class="kw">if</span> edad &gt;= <span class="num">18</span>:\n    <span class="fn">print</span>(<span class="str">"Eres mayor de edad"</span>)\n<span class="kw">elif</span> edad &gt;= <span class="num">13</span>:\n    <span class="fn">print</span>(<span class="str">"Eres adolescente"</span>)\n<span class="kw">else</span>:\n    <span class="fn">print</span>(<span class="str">"Eres menor de edad"</span>)`,
    cpp:    `<span class="ty">int</span> edad;\ncin &gt;&gt; edad;\n\n<span class="kw">if</span> (edad &gt;= <span class="num">18</span>) {\n    cout &lt;&lt; <span class="str">"Eres mayor de edad"</span> &lt;&lt; endl;\n} <span class="kw">else if</span> (edad &gt;= <span class="num">13</span>) {\n    cout &lt;&lt; <span class="str">"Eres adolescente"</span> &lt;&lt; endl;\n} <span class="kw">else</span> {\n    cout &lt;&lt; <span class="str">"Eres menor de edad"</span> &lt;&lt; endl;\n}`,
    java:   `<span class="ty">int</span> edad = sc.<span class="fn">nextInt</span>();\n\n<span class="kw">if</span> (edad &gt;= <span class="num">18</span>) {\n    System.out.<span class="fn">println</span>(<span class="str">"Eres mayor de edad"</span>);\n} <span class="kw">else if</span> (edad &gt;= <span class="num">13</span>) {\n    System.out.<span class="fn">println</span>(<span class="str">"Eres adolescente"</span>);\n} <span class="kw">else</span> {\n    System.out.<span class="fn">println</span>(<span class="str">"Eres menor de edad"</span>);\n}`,
    go:     `<span class="kw">var</span> edad <span class="ty">int</span>\nfmt.<span class="fn">Scan</span>(&amp;edad)\n\n<span class="kw">if</span> edad &gt;= <span class="num">18</span> {\n    fmt.<span class="fn">Println</span>(<span class="str">"Eres mayor de edad"</span>)\n} <span class="kw">else if</span> edad &gt;= <span class="num">13</span> {\n    fmt.<span class="fn">Println</span>(<span class="str">"Eres adolescente"</span>)\n} <span class="kw">else</span> {\n    fmt.<span class="fn">Println</span>(<span class="str">"Eres menor de edad"</span>)\n}`,
    csharp: `<span class="ty">int</span> edad = <span class="ty">int</span>.<span class="fn">Parse</span>(Console.<span class="fn">ReadLine</span>());\n\n<span class="kw">if</span> (edad &gt;= <span class="num">18</span>) {\n    Console.<span class="fn">WriteLine</span>(<span class="str">"Eres mayor de edad"</span>);\n} <span class="kw">else if</span> (edad &gt;= <span class="num">13</span>) {\n    Console.<span class="fn">WriteLine</span>(<span class="str">"Eres adolescente"</span>);\n} <span class="kw">else</span> {\n    Console.<span class="fn">WriteLine</span>(<span class="str">"Eres menor de edad"</span>);\n}`,
};
const IF_OUTPUT = {
    python: 'Eres mayor de edad',
    cpp:    'Eres mayor de edad',
    java:   'Eres mayor de edad',
    go:     'Eres mayor de edad',
    csharp: 'Eres mayor de edad',
};
const IF_QUIZ = {
    python: [{ q: 'Si <span class="ic">x = 5</span>, ¿qué imprime <span class="ic">if x > 3: print("A") else: print("B")</span>?', opts: ['A', 'B', 'AB', 'Nada'], correct: 0, feedback: '¡Correcto! 5 > 3 es verdadero, así que se ejecuta el bloque if y se imprime "A".' }],
    cpp:    [{ q: 'Si <span class="ic">x = 5</span>, ¿qué imprime <span class="ic">if (x > 3) cout << "A"; else cout << "B";</span>?', opts: ['A', 'B', 'AB', 'Nada'], correct: 0, feedback: '¡Correcto! 5 > 3 es true, así que se ejecuta el bloque if.' }],
    java:   [{ q: 'Si <span class="ic">x = 5</span>, ¿qué imprime <span class="ic">if (x > 3) println("A"); else println("B");</span>?', opts: ['A', 'B', 'AB', 'Nada'], correct: 0, feedback: '¡Correcto! 5 > 3 es true, se ejecuta el bloque if.' }],
    go:     [{ q: 'Si <span class="ic">x = 5</span>, ¿qué imprime <span class="ic">if x > 3 { println("A") } else { println("B") }</span>?', opts: ['A', 'B', 'AB', 'Nada'], correct: 0, feedback: '¡Correcto! 5 > 3 es true, se ejecuta el bloque if.' }],
    csharp: [{ q: 'Si <span class="ic">x = 5</span>, ¿qué imprime <span class="ic">if (x > 3) Console.Write("A"); else Console.Write("B");</span>?', opts: ['A', 'B', 'AB', 'Nada'], correct: 0, feedback: '¡Correcto! 5 > 3 es true, se ejecuta el bloque if.' }],
};

// ── Loops ──
const FOR_CODE = {
    python: `<span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">1</span>, <span class="num">6</span>):\n    <span class="fn">print</span>(i)`,
    cpp:    `<span class="kw">for</span> (<span class="ty">int</span> i = <span class="num">1</span>; i &lt;= <span class="num">5</span>; i++) {\n    cout &lt;&lt; i &lt;&lt; endl;\n}`,
    java:   `<span class="kw">for</span> (<span class="ty">int</span> i = <span class="num">1</span>; i &lt;= <span class="num">5</span>; i++) {\n    System.out.<span class="fn">println</span>(i);\n}`,
    go:     `<span class="kw">for</span> i := <span class="num">1</span>; i &lt;= <span class="num">5</span>; i++ {\n    fmt.<span class="fn">Println</span>(i)\n}`,
    csharp: `<span class="kw">for</span> (<span class="ty">int</span> i = <span class="num">1</span>; i &lt;= <span class="num">5</span>; i++) {\n    Console.<span class="fn">WriteLine</span>(i);\n}`,
};
const WHILE_CODE = {
    python: `n = <span class="ty">int</span>(<span class="fn">input</span>())\n<span class="kw">while</span> n != <span class="num">0</span>:\n    <span class="fn">print</span>(<span class="str">"Recibido:"</span>, n)\n    n = <span class="ty">int</span>(<span class="fn">input</span>())\n<span class="fn">print</span>(<span class="str">"Fin"</span>)`,
    cpp:    `<span class="ty">int</span> n;\ncin &gt;&gt; n;\n<span class="kw">while</span> (n != <span class="num">0</span>) {\n    cout &lt;&lt; <span class="str">"Recibido: "</span> &lt;&lt; n &lt;&lt; endl;\n    cin &gt;&gt; n;\n}\ncout &lt;&lt; <span class="str">"Fin"</span> &lt;&lt; endl;`,
    java:   `<span class="ty">int</span> n = sc.<span class="fn">nextInt</span>();\n<span class="kw">while</span> (n != <span class="num">0</span>) {\n    System.out.<span class="fn">println</span>(<span class="str">"Recibido: "</span> + n);\n    n = sc.<span class="fn">nextInt</span>();\n}\nSystem.out.<span class="fn">println</span>(<span class="str">"Fin"</span>);`,
    go:     `<span class="kw">var</span> n <span class="ty">int</span>\nfmt.<span class="fn">Scan</span>(&amp;n)\n<span class="kw">for</span> n != <span class="num">0</span> {\n    fmt.<span class="fn">Println</span>(<span class="str">"Recibido:"</span>, n)\n    fmt.<span class="fn">Scan</span>(&amp;n)\n}\nfmt.<span class="fn">Println</span>(<span class="str">"Fin"</span>)`,
    csharp: `<span class="ty">int</span> n = <span class="ty">int</span>.<span class="fn">Parse</span>(Console.<span class="fn">ReadLine</span>());\n<span class="kw">while</span> (n != <span class="num">0</span>) {\n    Console.<span class="fn">WriteLine</span>(<span class="str">"Recibido: "</span> + n);\n    n = <span class="ty">int</span>.<span class="fn">Parse</span>(Console.<span class="fn">ReadLine</span>());\n}\nConsole.<span class="fn">WriteLine</span>(<span class="str">"Fin"</span>);`,
};
const WHILE_EXPLAIN = {
    python: `<p class="lesson-text">Este patrón — <em>"leer hasta que llegue un 0"</em> — es muy común en problemas de competición. El bucle sigue mientras <span class="ic">n != 0</span>; cuando el usuario escribe 0 el bucle termina.</p>`,
    cpp:    `<p class="lesson-text">Este patrón es muy común en problemas de competición. El bucle <span class="ic">while (n != 0)</span> sigue ejecutándose hasta que el usuario escribe 0.</p>`,
    java:   `<p class="lesson-text">El bucle <span class="ic">while (n != 0)</span> sigue ejecutándose hasta que el usuario escribe 0. Muy común en problemas donde no sabes cuántos datos vas a recibir.</p>`,
    go:     `<p class="lesson-text">En Go no existe <span class="ic">while</span>: se usa <span class="ic">for</span> con condición. <span class="ic">for n != 0</span> equivale al <span class="ic">while (n != 0)</span> de otros lenguajes.</p>`,
    csharp: `<p class="lesson-text">El bucle <span class="ic">while (n != 0)</span> sigue ejecutándose hasta que el usuario escribe 0. Muy común en problemas donde no sabes cuántos datos vas a recibir.</p>`,
};
const LOOP_QUIZ = {
    python: [{ q: '¿Cuántas veces imprime algo este bucle? <span class="ic">for i in range(3, 8): print(i)</span>', opts: ['5 veces', '8 veces', '3 veces', '4 veces'], correct: 0, feedback: '¡Correcto! range(3,8) genera los valores 3,4,5,6,7 — son 5 valores, por lo que el cuerpo se ejecuta 5 veces.' }],
    cpp:    [{ q: '¿Cuántas veces se ejecuta el cuerpo de <span class="ic">for (int i=0; i&lt;5; i++)</span>?', opts: ['5 veces', '6 veces', '4 veces', '0 veces'], correct: 0, feedback: '¡Correcto! i va de 0 a 4 (mientras i < 5), es decir 5 iteraciones.' }],
    java:   [{ q: '¿Cuántas veces se ejecuta el cuerpo de <span class="ic">for (int i=0; i&lt;5; i++)</span>?', opts: ['5 veces', '6 veces', '4 veces', '0 veces'], correct: 0, feedback: '¡Correcto! i va de 0 a 4, son 5 iteraciones.' }],
    go:     [{ q: '¿Cuántas veces se ejecuta el cuerpo de <span class="ic">for i:=0; i&lt;5; i++</span>?', opts: ['5 veces', '6 veces', '4 veces', '0 veces'], correct: 0, feedback: '¡Correcto! i va de 0 a 4, son 5 iteraciones.' }],
    csharp: [{ q: '¿Cuántas veces se ejecuta el cuerpo de <span class="ic">for (int i=0; i&lt;5; i++)</span>?', opts: ['5 veces', '6 veces', '4 veces', '0 veces'], correct: 0, feedback: '¡Correcto! i va de 0 a 4, son 5 iteraciones.' }],
};

// ── A+B solution ──
const AB_CODE = {
    python: `a, b = <span class="ty">map</span>(<span class="ty">int</span>, <span class="fn">input</span>().<span class="fn">split</span>())\n<span class="fn">print</span>(a + b)`,
    cpp:    `<span class="kw">#include</span> <span class="str">&lt;iostream&gt;</span>\n<span class="kw">using namespace</span> std;\n<span class="ty">int</span> <span class="fn">main</span>() {\n    <span class="ty">int</span> a, b;\n    cin &gt;&gt; a &gt;&gt; b;\n    cout &lt;&lt; a + b &lt;&lt; endl;\n    <span class="kw">return</span> <span class="num">0</span>;\n}`,
    java:   `<span class="kw">import</span> java.util.Scanner;\n<span class="kw">public class</span> <span class="ty">Main</span> {\n    <span class="kw">public static void</span> <span class="fn">main</span>(<span class="ty">String</span>[] args) {\n        <span class="ty">Scanner</span> sc = <span class="kw">new</span> <span class="ty">Scanner</span>(System.in);\n        <span class="ty">int</span> a = sc.<span class="fn">nextInt</span>();\n        <span class="ty">int</span> b = sc.<span class="fn">nextInt</span>();\n        System.out.<span class="fn">println</span>(a + b);\n    }\n}`,
    go:     `<span class="kw">package</span> main\n<span class="kw">import</span> <span class="str">"fmt"</span>\n<span class="kw">func</span> <span class="fn">main</span>() {\n    <span class="kw">var</span> a, b <span class="ty">int</span>\n    fmt.<span class="fn">Scan</span>(&amp;a, &amp;b)\n    fmt.<span class="fn">Println</span>(a + b)\n}`,
    csharp: `<span class="kw">using</span> System;\n<span class="kw">class</span> <span class="ty">Program</span> {\n    <span class="kw">static void</span> <span class="fn">Main</span>() {\n        <span class="ty">string</span>[] p = Console.<span class="fn">ReadLine</span>().<span class="fn">Split</span>();\n        <span class="ty">int</span> a = <span class="ty">int</span>.<span class="fn">Parse</span>(p[<span class="num">0</span>]);\n        <span class="ty">int</span> b = <span class="ty">int</span>.<span class="fn">Parse</span>(p[<span class="num">1</span>]);\n        Console.<span class="fn">WriteLine</span>(a + b);\n    }\n}`,
};
const AB_EXPLAIN = {
    python: 'Leemos los dos enteros de la misma línea con <span class="ic">map(int, input().split())</span> — esto divide la línea por espacios y convierte cada parte a entero. Luego imprimimos la suma. Así de sencillo.',
    cpp:    '<span class="ic">cin >> a >> b</span> lee dos enteros separados por espacio (o salto de línea). Luego <span class="ic">cout << a + b</span> imprime el resultado.',
    java:   'El <span class="ic">Scanner</span> con <span class="ic">nextInt()</span> lee automáticamente los espacios entre números. Dos llamadas a <span class="ic">nextInt()</span> leen los dos valores.',
    go:     '<span class="ic">fmt.Scan(&a, &b)</span> lee los dos enteros de la entrada estándar, separados por cualquier espacio en blanco.',
    csharp: 'Leemos toda la línea, la partimos por espacios con <span class="ic">Split()</span> y convertimos cada trozo a entero con <span class="ic">int.Parse()</span>.',
};

// ─────────────────────────────────────────────
//  RENDER ENGINE
// ─────────────────────────────────────────────
function renderLesson(index) {
    const main = document.getElementById('tutMain');
    const lesson = LESSONS[index];
    if (!lesson) return;

    const isLast = index === TOTAL_LESSONS - 1;
    const prevDisabled = index === 0 ? 'disabled' : '';

    main.innerHTML = `
<div class="lesson-wrap">
  <div class="lesson-eyebrow">
    <span class="lesson-eyebrow-dot"></span>
    LECCIÓN ${String(index + 1).padStart(2, '0')} · ${LANG_DISPLAY[currentLang]}
  </div>
  <h1 class="lesson-title">${lesson.title}</h1>
  <p class="lesson-subtitle">${lesson.subtitle}</p>

  ${lesson.build(currentLang)}

  <div class="lesson-nav-btns">
    <button class="btn-lesson-nav" onclick="navigateLesson(${index - 1})" ${prevDisabled}>← Anterior</button>
    <span class="lesson-position">${index + 1} / ${TOTAL_LESSONS}</span>
    ${isLast
        ? `<button class="btn-lesson-nav primary" onclick="finishLesson(${index})">Completar ✓</button>`
        : `<button class="btn-lesson-nav primary" onclick="finishLesson(${index})">Siguiente →</button>`
    }
  </div>
</div>`;

    main.scrollTop = 0;
    currentLesson = index;
    renderSidebar();
}

function navigateLesson(index) {
    if (index < 0 || index >= TOTAL_LESSONS) return;
    currentLesson = index;
    renderLesson(index);
    highlightSidebarBtn(index);
}

function finishLesson(index) {
    markComplete(index);
    if (index < TOTAL_LESSONS - 1) {
        navigateLesson(index + 1);
    }
}

function renderSidebar() {
    const progress = getProgress();
    const count = progress.length;
    const pct = Math.round((count / TOTAL_LESSONS) * 100);

    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${count} / ${TOTAL_LESSONS}`;

    for (let i = 0; i < TOTAL_LESSONS; i++) {
        const btn = document.querySelector(`.lesson-btn[data-lesson="${i}"]`);
        if (!btn) continue;
        btn.classList.toggle('completed', progress.includes(i));
        btn.classList.toggle('active', i === currentLesson);
    }
}

function highlightSidebarBtn(index) {
    document.querySelectorAll('.lesson-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.lesson-btn[data-lesson="${index}"]`);
    if (btn) btn.classList.add('active');
}

// ─────────────────────────────────────────────
//  QUIZ ANSWER HANDLER
// ─────────────────────────────────────────────
window.handleAnswer = function(qid, chosen, correct, btn) {
    const opts = document.querySelectorAll(`[data-qid="${qid}"]`);
    opts.forEach(b => { b.disabled = true; });

    const fb = document.getElementById(`${qid}_fb`);
    if (chosen === correct) {
        btn.classList.add('correct');
        fb.className = 'practice-feedback show ok';
        fb.innerHTML = '✓ ' + (_quizFeedbackMap[qid] || '¡Correcto!');
    } else {
        btn.classList.add('wrong');
        opts[correct].classList.add('correct');
        fb.className = 'practice-feedback show fail';
        fb.innerHTML = '✗ No es correcto. La respuesta correcta está marcada en verde.';
    }
};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Language tabs
    document.querySelectorAll('.lang-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLang = btn.dataset.lang;
            quizIdCounter = 0;
            renderLesson(currentLesson);
            renderSidebar();
        });
    });

    // Lesson nav buttons
    document.querySelectorAll('.lesson-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.lesson);
            navigateLesson(idx);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            window.location.href = 'Login.html';
        });
    }

    // Nav avatar
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    fetch('https://codexarapi.onrender.com/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(user => {
        const navUser = document.getElementById('navUsername');
        const navAv   = document.getElementById('navAvatar');
        if (navUser) navUser.textContent = user.username;
        if (navAv) {
            if (user.avatar) {
                navAv.style.backgroundImage    = `url(${user.avatar})`;
                navAv.style.backgroundSize     = 'cover';
                navAv.style.backgroundPosition = 'center';
                navAv.style.border             = '1px solid var(--accent-cyan)';
                navAv.textContent = '';
            } else {
                navAv.textContent = user.username.charAt(0).toUpperCase();
            }
        }
    })
    .catch(() => { window.location.href = 'Login.html'; });

    // Restore last lesson for this lang
    const savedLesson = parseInt(localStorage.getItem(`tut_lesson_${currentLang}`)) || 0;
    currentLesson = Math.min(savedLesson, TOTAL_LESSONS - 1);

    // Render
    quizIdCounter = 0;
    renderLesson(currentLesson);
    renderSidebar();
});

// Persist current lesson on nav
window.navigateLesson = function(index) {
    if (index < 0 || index >= TOTAL_LESSONS) return;
    currentLesson = index;
    localStorage.setItem(`tut_lesson_${currentLang}`, index);
    quizIdCounter = 0;
    renderLesson(index);
    highlightSidebarBtn(index);
};

window.finishLesson = function(index) {
    markComplete(index);
    localStorage.setItem(`tut_lesson_${currentLang}`, Math.min(index + 1, TOTAL_LESSONS - 1));
    if (index < TOTAL_LESSONS - 1) {
        navigateLesson(index + 1);
    }
};
