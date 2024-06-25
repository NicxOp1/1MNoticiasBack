import cheerio from "cheerio";
import puppeteer from "puppeteer";
//funciones
const scrapeWebsiteElUniversal = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  const html = await page.content();
  const $ = cheerio.load(html);
  const imageUrl = $(".story__img").attr("data-src");

  let title = $("h1.title.text-center.font-bold").text().trim();
  if (!title) {
    title = $("h1.title.font-bold").text().trim();
  }

  // Frase no deseada dividida para mayor precisión en caso de que haya variaciones en el texto
  const unwantedPhrases = [
    "Únete a nuestro canal ¡EL UNIVERSAL ya está en Whatsapp!",
    "desde tu dispositivo móvil entérate de las noticias más relevantes del día",
    "artículos de opinión, entretenimiento, tendencias y más.",
    "bmc/apr",
  ];
  let sectionContent = "";
  $("section p.sc__font-paragraph").each((index, element) => {
    let paragraphText = $(element).text().trim().replace(/\s\s+/g, " ");
    // Verifica y elimina cada una de las frases no deseadas
    unwantedPhrases.forEach((unwantedPhrase) => {
      if (paragraphText.includes(unwantedPhrase)) {
        console.log(`Frase no deseada encontrada: ${unwantedPhrase}`);
        paragraphText = paragraphText.replace(unwantedPhrase, "").trim();
      }
    });
    sectionContent += paragraphText + " ";
  });

  await browser.close();

  return { title, sectionContent, imageUrl };
};
const scrapeWebsiteMvsNoticias = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  const html = await page.content();
  const $ = cheerio.load(html);

  // Asegúrate de que la URL de la imagen sea absoluta
  let imageUrl = $("figure.main-photo amp-img").attr("src");
  if (imageUrl.startsWith("/")) {
    imageUrl = "https://www.mvsnoticias.com" + imageUrl;
  }

  // Usa el selector 'h1.titulo' para extraer el título
  let title = $("h1.titulo").text().trim();

  // Usa el selector '.article-content--cuerpo p' para extraer el contenido
  let sectionContent = "";
  $(".article-content--cuerpo p").each((index, element) => {
    sectionContent += $(element).text().trim().replace(/\s\s+/g, " ") + " ";
  });

  await browser.close();

  return { title, sectionContent, imageUrl };
};
const scrapeWebsiteGrux = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 10000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  const html = await page.content();
  const $ = cheerio.load(html);

  // Usa el selector 'picture .img-responsive' para extraer la URL de la imagen
  let imageUrl = $("picture img.img-responsive").attr("src");
  if (imageUrl.startsWith("/")) {
    imageUrl = "https://gluc.mx/" + imageUrl;
  }

  // Usa el selector 'h1.titular' para extraer el título
  let title = $("h1.titular").text().trim();

  // Usa el selector '.cuerpo-nota p' para extraer el contenido de los dos primeros párrafos
  let sectionContent = "";
  $(".cuerpo-nota p")
    .slice(0, 2)
    .each((index, element) => {
      sectionContent += $(element).text().trim().replace(/\s\s+/g, " ") + " ";
    });

  await browser.close();

  return { title, sectionContent, imageUrl };
};

const scrapeWebsiteLatinus = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      timeout: 10000, // Aumentado para dar más tiempo a Puppeteer para iniciar
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();

    await page.goto(url);
    await page.setViewport({ width: 1920, height: 1080 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Espera por el selector de la imagen, si no se encuentra lanza un error
    try {
      await page.waitForSelector("figure.wp-caption img", { timeout: 5000 });
    } catch (error) {
      throw new Error("Imagen no encontrada en el tiempo esperado.");
    }
    let imageUrl = $("figure.wp-caption img").attr("src");

    // Espera por el selector del título, si no se encuentra lanza un error
    try {
      await page.waitForSelector("h1.elementor-heading-title", {
        timeout: 5000,
      });
    } catch (error) {
      throw new Error("Título no encontrado en el tiempo esperado.");
    }
    let title = $("h1.elementor-heading-title").text().trim();

    let sectionContent = "";
    $(".elementor-widget-container p").each((index, element) => {
      sectionContent += $(element).text().trim().replace(/\s\s+/g, " ") + " ";
    });

    // Verifica si se encontró contenido, si no, lanza un error
    if (!sectionContent) {
      throw new Error("Contenido de la sección no encontrado.");
    }

    const copyrightIndex = sectionContent.indexOf("Copyright ©");
    if (copyrightIndex !== -1) {
      sectionContent = sectionContent.substring(0, copyrightIndex).trim();
    }

    return { title, sectionContent, imageUrl };
  } catch (error) {
    console.error("Error scraping website:", error);
    if (browser) {
      try {
        const page = await browser.newPage();
        await page.goto(url);
        await page.screenshot({ path: "error_screenshot.png" });
      } catch (screenshotError) {
        console.error("Error taking screenshot:", screenshotError);
      } finally {
        await browser.close();
      }
    }
    throw error; // Re-throw the error after handling it
  }
};
const scrapeWebsiteCnn = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url);
  await page.setViewport({ width: 1080, height: 1024 });

  const html = await page.content();
  const $ = cheerio.load(html);

  // Usa el selector 'h1.story-title' para extraer el título
  let title = $("h1.story-title").text().trim();

  // Usa el selector '.storyfull__body p' para extraer el contenido de todos los párrafos
  let sectionContent = "";
  $(".storyfull__body")
    .find("p")
    .each((index, element) => {
      sectionContent += $(element).text().trim().replace(/\s\s+/g, " ") + " ";
    });

  // Elimina los prefijos "(CNN Español) --" y "(CNN) --" si existen
  sectionContent = sectionContent
    .replace("(CNN Español) --", "")
    .replace("(CNN) --", "")
    .trim();

  // Busca la posición del texto de copyright y corta la cadena hasta ese punto
  const copyrightIndex = sectionContent.indexOf("Copyright ©");
  if (copyrightIndex !== -1) {
    sectionContent = sectionContent.substring(0, copyrightIndex).trim();
  }

  await browser.close();

  return { title, sectionContent };
};

const scrapeWebsiteTvNotas = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  try {
    await page.waitForSelector("h1.Page-headline", { timeout: 10000 });
  } catch (error) {
    console.error("El selector 'h1.Page-headline' no fue encontrado.");
    await browser.close();
    return { title: "No encontrado", content: "", imageUrl: "" };
  }

  const title = await page.evaluate(() => {
    const h1 = document.querySelector("h1.Page-headline");
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Extraer el contenido del artículo
  const content = await page.evaluate(() => {
    const paragraphs = Array.from(
      document.querySelectorAll(".Page-TvNotasArticleBody p")
    );
    return paragraphs.map((p) => p.innerText.trim()).join("\n");
  });

  // Extraer la URL de la imagen
  const imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector("img.Image");
    return imageElement ? imageElement.src : "";
  });

  await browser.close();

  return { title, content, imageUrl };
};
const scrapeWebsitetvAzteca = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  try {
    await page.waitForSelector("h1.Page-headline", { timeout: 10000 });
  } catch (error) {
    console.error("El selector 'h1.Page-headline' no fue encontrado.");
    await browser.close();
    return { title: "No encontrado", content: "", imageUrl: "" };
  }

  const title = await page.evaluate(() => {
    const h1 = document.querySelector("h1.Page-headline");
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Extraer el contenido del artículo
  const content = await page.evaluate(() => {
    const paragraphs = Array.from(
      document.querySelectorAll(".Page-TvNotasArticleBody p")
    );
    return paragraphs.map((p) => p.innerText.trim()).join("\n");
  });

  // Extraer la URL de la imagen
  const imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector("img.Image");
    return imageElement ? imageElement.src : "";
  });

  await browser.close();

  return { title, content, imageUrl };
};
const scrapeWebsitetelemudno = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:     
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  let title = await page.evaluate(() => {
    const h1 = document.querySelector("h1.article-hero-headline__htag");
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Si el título no fue encontrado con el primer selector, intentar con el segundo selector
  if (title === "No encontrado") {
    title = await page.evaluate(() => {
      const h1 = document.querySelector("h1.video-details__title span");
      return h1 ? h1.innerText.trim() : "No encontrado";
    });
  }

  let content = await page.evaluate(() => {
    const paragraphs = Array.from(
      document.querySelectorAll(".article-body__content p")
    );
    let fullText = paragraphs.map((p) => p.innerText.trim()).join("\n");
    return fullText;
  });

  // Si el contenido principal está vacío, intentar con el selector de respaldo
  if (!content.trim()) {
    content = await page.evaluate(() => {
      const dekDescription = document.querySelector("span.video-details__dek-description");
      return dekDescription ? dekDescription.innerText.trim() : "";
    });
  }

  const cutoffText = "Únete a nuestro canal de Telemundo Entretenimiento en WhatsApp y mantente al tanto de las últimas noticias de tus estrellas favoritas! También únete a nuestro canal de Telemundo en WhatsApp para recibir contenido exclusivo, las noticias más importantes, lo último en entretenimiento y deportes, lo mejor de tus series favoritas y mucho más.";
  const cutoffIndex = content.indexOf(cutoffText);
  content = cutoffIndex !== -1 ? content.substring(0, cutoffIndex).trim() : content;

  let imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector(".article-hero__media img");
    return imageElement ? imageElement.src : "";
  });

  // Si no se encontró la imagen principal, intentar obtener la imagen de fondo del div
  if (!imageUrl) {
    imageUrl = await page.evaluate(() => {
      const divBackground = document.querySelector("div.jw-preview.jw-reset");
      if (divBackground && divBackground.style.backgroundImage) {
        const urlMatch = divBackground.style.backgroundImage.match(/url\("(.+?)"\)/);
        return urlMatch ? urlMatch[1] : "";
      }
      return "";
    });
  }

  await browser.close();

  return { title, content, imageUrl };
};
const scrapeWebsiteInformador = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  try {
    await page.waitForSelector("h1.news-title", { timeout: 10000 });
  } catch (error) {
    console.error("El selector 'h1.news-title' no fue encontrado.");
    await browser.close();
    return { title: "No encontrado", content: "", imageUrl: "" };
  }

  const title = await page.evaluate(() => {
    const h1 = document.querySelector("h1.news-title");
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Extraer el contenido del artículo hasta el texto especificado
  const content = await page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll(".news-body p"));
    let fullText = paragraphs.map((p) => p.innerText.trim()).join("\n");
    const cutoffText =
      "Mantente al día con las noticias, únete a nuestro canal de WhatsApp\n\n\nOF\n\nRegistrarse implica aceptar los Términos y Condiciones";
    const cutoffIndex = fullText.indexOf(cutoffText);
    return cutoffIndex !== -1
      ? fullText.substring(0, cutoffIndex).trim()
      : fullText;
  });

  // Extraer la URL de la imagen
  const imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector("div.cover-image img");
    const baseUrl = "https://www.elinformador.com";
    return imageElement ? baseUrl + imageElement.getAttribute("src") : "";
  });

  await browser.close();

  return { title, content, imageUrl };
};
const scrapeWebsiteMarca = async (url) => {
  const browser = await puppeteer.launch({
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  try {
    await page.waitForSelector("h1.ue-c-article__headline", { timeout: 10000 });
  } catch (error) {
    console.error("El selector 'h1.ue-c-article__headline' no fue encontrado.");
    await browser.close();
    return { title: "No encontrado", content: "", imageUrl: "" };
  }

  const title = await page.evaluate(() => {
    const h1 = document.querySelector("h1.ue-c-article__headline");
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Extraer el contenido del artículo hasta el texto especificado
  const content = await page.evaluate(() => {
    const paragraphs = Array.from(
      document.querySelectorAll(".ue-c-article__body p")
    );
    let fullText = paragraphs.map((p) => p.innerText.trim()).join("\n");
    const cutoffText =
      "Apúntate aquí a esta newsletter gratuita que te enviaremos a tu correo todos los días durante el campeonato a primera hora de la mañana";
    const cutoffIndex = fullText.indexOf(cutoffText);
    return cutoffIndex !== -1
      ? fullText.substring(0, cutoffIndex).trim()
      : fullText;
  });

  // Extraer la URL de la imagen
  const imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector("img.ue-c-article__image");
    const baseUrl = "https://www.elinformador.com";
    return imageElement ? imageElement.getAttribute("src") : "";
  });

  await browser.close();

  return { title, content, imageUrl };
};
const scrapeWebsiteMilenio = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    timeout: 100000,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1024 });

  // Tomar una captura de pantalla para depuración
  await page.screenshot({ path: "debug_screenshot.png" });

  try {
    await page.waitForSelector(
      "h1.nd-title-headline-title-headline-base__title",
      { timeout: 10000 }
    );
  } catch (error) {
    console.error(
      "El selector 'h1.nd-title-headline-title-headline-base__title' no fue encontrado."
    );
    await browser.close();
    return { title: "No encontrado", content: "", imageUrl: "" };
  }

  const title = await page.evaluate(() => {
    const h1 = document.querySelector(
      "h1.nd-title-headline-title-headline-base__title"
    );
    return h1 ? h1.innerText.trim() : "No encontrado";
  });

  // Extraer el contenido del artículo hasta el texto especificado
  const content = await page.evaluate(() => {
    const paragraphs = Array.from(
      document.querySelectorAll(".media-container-news p")
    );
    let fullText = paragraphs.map((p) => p.innerText.trim()).join("\n");
    const cutoffText =
      "Apúntate aquí a esta newsletter gratuita que te enviaremos a tu correo todos los días durante el campeonato a primera hora de la mañana";
    const cutoffIndex = fullText.indexOf(cutoffText);
    return cutoffIndex !== -1
      ? fullText.substring(0, cutoffIndex).trim()
      : fullText;
  });

  // Extraer la URL de la imagen
  const imageUrl = await page.evaluate(() => {
    const imageElement = document.querySelector(
      "img.nd-media-detail-base__img"
    );
    const baseUrl = "https://www.elinformador.com";
    return imageElement ? imageElement.getAttribute("src") : "";
  });

  await browser.close();

  return { title, content, imageUrl };
};
export {
  scrapeWebsiteElUniversal,
  scrapeWebsiteMvsNoticias,
  scrapeWebsiteGrux,
  scrapeWebsiteLatinus,
  scrapeWebsiteCnn,
  scrapeWebsiteTvNotas,
  scrapeWebsitetvAzteca,
  scrapeWebsiteMarca,
  scrapeWebsiteInformador,
  scrapeWebsitetelemudno,
  scrapeWebsiteMilenio,
};
