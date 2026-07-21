import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';
import { Character, RuleSystem } from '@/types/game';

export interface ExtractedPayload {
  type: 'character' | 'rule_system';
  data: any;
}

/**
 * Converte uma string UTF-8 para Uint8Array.
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converte Uint8Array/Buffer para string UTF-8.
 */
function uint8ArrayToString(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Gera um PDF formatado para a Ficha do Personagem com o JSON bruto embutido.
 */
export async function exportCharacterToPdf(character: Character): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Formato A4
  const { height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Cabeçalho Visual
  page.drawRectangle({
    x: 30,
    y: height - 70,
    width: 535,
    height: 45,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText('GALERIA DE DEFENSORES — FICHA DE PERSONAGEM', {
    x: 45,
    y: height - 50,
    size: 14,
    font: fontBold,
    color: rgb(0.7, 0.4, 0.95),
  });

  // 2. Informações do Personagem
  let y = height - 95;

  page.drawText(`Nome: ${character.name || 'Sem nome'}`, {
    x: 35,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Conceito: ${character.concept || 'N/A'}`, {
    x: 300,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 20;

  const scaleLabels = ['Ningen (Humano)', 'Sugoi (Heroico)', 'Kiodai (Gigante)', 'Kami (Divino)'];
  page.drawText(`Escala: ${scaleLabels[character.scale] || 'Ningen'}`, {
    x: 35,
    y,
    size: 10,
    font: fontRegular,
  });

  page.drawText(`Pontos Totais: ${character.points_total || 0} | Gastos: ${character.points_spent || 0} | XP: ${character.experience || 0}`, {
    x: 300,
    y,
    size: 10,
    font: fontRegular,
  });

  y -= 30;

  // 3. Atributos Principais
  page.drawText('ATRIBUTOS', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.7),
  });
  y -= 15;

  const attrs = character.attributes_values || {};
  let attrText = Object.entries(attrs)
    .map(([key, val]) => `${key}: ${val}`)
    .join('  |  ');
  if (!attrText) attrText = 'F: 0  |  H: 0  |  R: 0  |  A: 0  |  PdF: 0';

  page.drawText(attrText, {
    x: 35,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 30;

  // 4. Recursos (PV / PM)
  page.drawText('RECURSOS', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.7),
  });
  y -= 15;

  const res = character.resources_current || {};
  const resText = Object.entries(res)
    .map(([key, val]) => `${key}: ${val}`)
    .join('  |  ');

  page.drawText(resText || 'Sem recursos salvos', {
    x: 35,
    y,
    size: 10,
    font: fontRegular,
  });

  y -= 30;

  // 5. Vantagens e Desvantagens
  page.drawText('VANTAGENS', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.2, 0.6, 0.3),
  });
  y -= 15;

  const advs = (character.advantages || []).map(a => `${a.name} (${a.cost || '0'})`).join(', ');
  page.drawText(advs || 'Nenhuma vantagem registrada.', {
    x: 35,
    y,
    size: 9,
    font: fontRegular,
  });

  y -= 25;

  page.drawText('DESVANTAGENS', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.8, 0.2, 0.2),
  });
  y -= 15;

  const disadvs = (character.disadvantages || []).map(d => `${d.name} (${d.cost || '0'})`).join(', ');
  page.drawText(disadvs || 'Nenhuma desvantagem registrada.', {
    x: 35,
    y,
    size: 9,
    font: fontRegular,
  });

  y -= 40;

  // Rodapé do PDF
  page.drawText('Documento gerado automaticamente por Galeria de Defensores. Contém dados de backup embutidos.', {
    x: 35,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // 6. EMBUTIR PAYLOAD DE DADOS (JSON)
  const payloadWrapper = {
    gdd_format: 'GDD_PAYLOAD_V1',
    type: 'character',
    data: character,
    timestamp: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(payloadWrapper);
  const jsonBytes = stringToUint8Array(jsonStr);

  // A. Anexo de Arquivo
  await pdfDoc.attach(jsonBytes, 'character.json', {
    mimeType: 'application/json',
    description: 'Galeria de Defensores Character Data Payload',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // B. Metadado de Palavras-Chave (Fallback para leitores)
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(jsonBytes).toString('base64')
    : btoa(jsonStr);
  pdfDoc.setKeywords(['GDD_TYPE:character', `GDD_PAYLOAD:${b64}`]);

  return pdfDoc.save();
}

/**
 * Gera um PDF formatado para o Livro de Regras do Sistema com o JSON bruto embutido.
 */
export async function exportRuleSystemToPdf(ruleSystem: RuleSystem): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Cabeçalho
  page.drawRectangle({
    x: 30,
    y: height - 70,
    width: 535,
    height: 45,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText('GALERIA DE DEFENSORES — LIVRO DE REGRAS DO SISTEMA', {
    x: 45,
    y: height - 50,
    size: 13,
    font: fontBold,
    color: rgb(0.2, 0.7, 0.9),
  });

  let y = height - 95;

  page.drawText(`Sistema: ${ruleSystem.name || 'Sem nome'}`, {
    x: 35,
    y,
    size: 12,
    font: fontBold,
  });

  y -= 20;

  page.drawText(`Descrição: ${ruleSystem.description || 'Sem descrição.'}`, {
    x: 35,
    y,
    size: 10,
    font: fontRegular,
  });

  y -= 30;

  // Atributos do Sistema
  page.drawText('ESQUEMA DE ATRIBUTOS', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.7),
  });
  y -= 15;

  const attrList = Object.keys(ruleSystem.attributes || {}).join(', ');
  page.drawText(attrList || 'Atributos padrão (F, H, R, A, PdF)', {
    x: 35,
    y,
    size: 10,
    font: fontRegular,
  });

  y -= 30;

  // Recursos do Sistema
  page.drawText('RECURSOS DO SISTEMA', {
    x: 35,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.7),
  });
  y -= 15;

  const resList = Object.keys(ruleSystem.resources || {}).join(', ');
  page.drawText(resList || 'Recursos padrão (PV, PM)', {
    x: 35,
    y,
    size: 10,
    font: fontRegular,
  });

  // EMBUTIR PAYLOAD DE DADOS (JSON)
  const payloadWrapper = {
    gdd_format: 'GDD_PAYLOAD_V1',
    type: 'rule_system',
    data: ruleSystem,
    timestamp: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(payloadWrapper);
  const jsonBytes = stringToUint8Array(jsonStr);

  // A. Anexo de Arquivo
  await pdfDoc.attach(jsonBytes, 'rule_system.json', {
    mimeType: 'application/json',
    description: 'Galeria de Defensores Rule System Data Payload',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // B. Metadado Keywords
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(jsonBytes).toString('base64')
    : btoa(jsonStr);
  pdfDoc.setKeywords(['GDD_TYPE:rule_system', `GDD_PAYLOAD:${b64}`]);

  return pdfDoc.save();
}

/**
 * Lê e extrai os dados embutidos de um arquivo PDF gerado pelo sistema.
 */
export async function importFromPdf(pdfBytes: Uint8Array | ArrayBuffer): Promise<ExtractedPayload> {
  const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const loadedDoc = await PDFDocument.load(bytes);

  // 1. Método A: Tentar extrair do Metadado (Keywords)
  const keywords = loadedDoc.getKeywords() || '';
  for (const token of keywords.split(' ')) {
    if (token.startsWith('GDD_PAYLOAD:')) {
      const b64 = token.substring('GDD_PAYLOAD:'.length);
      const jsonStr = typeof Buffer !== 'undefined'
        ? Buffer.from(b64, 'base64').toString('utf8')
        : atob(b64);

      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.data && parsed.type) {
        return { type: parsed.type, data: parsed.data };
      }
    }
  }

  // 2. Método B: Tentar extrair dos Anexos do PDF (EmbeddedFiles)
  try {
    const names = loadedDoc.catalog.get(PDFName.of('Names'));
    if (names) {
      const ef = (names as any).get(PDFName.of('EmbeddedFiles'));
      if (ef) {
        const namesArray = (ef as any).get(PDFName.of('Names'));
        if (namesArray && namesArray.array) {
          for (let i = 1; i < namesArray.array.length; i += 2) {
            const filespec = namesArray.array[i];
            const efDict = filespec.get(PDFName.of('EF'));
            if (efDict) {
              const stream = efDict.get(PDFName.of('F'));
              if (stream) {
                const streamData = (stream as any).getUncompressedContents();
                const jsonStr = uint8ArrayToString(streamData);
                const parsed = JSON.parse(jsonStr);
                if (parsed && parsed.data && parsed.type) {
                  return { type: parsed.type, data: parsed.data };
                } else if (parsed && (parsed.name || parsed.attributes_values)) {
                  // Fallback se for JSON direto da ficha
                  const isChar = !!parsed.attributes_values || !!parsed.concept;
                  return { type: isChar ? 'character' : 'rule_system', data: parsed };
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao varrer anexos do PDF:', err);
  }

  throw new Error('Não foi possível encontrar um payload de dados válido da Galeria de Defensores neste arquivo PDF.');
}
