const LZString = require('lz-string');

/**
 * Infer general component category from KiCAD reference designator prefix, value, or footprint
 * E.g., 'C1' -> 'capacitor', 'R3' -> 'resistor', '_Button_1' -> 'switch'
 */
function inferCategory(ref = '', val = '', footprint = '') {
  const cleanRef = (ref || '').replace(/^[^a-zA-Z]+/, '');
  const prefix = (cleanRef.match(/^[A-Za-z]+/)?.[0] || '').toUpperCase();

  // 1. Ref designator prefix matching
  if (['R', 'RN', 'RV', 'RES'].includes(prefix)) return 'resistor';
  if (['C', 'CP', 'CAP'].includes(prefix)) return 'capacitor';
  if (['L', 'FB', 'IND'].includes(prefix)) return 'inductor';
  if (['LED'].includes(prefix)) return 'led';
  if (['D', 'DIODE'].includes(prefix)) return 'diode';
  if (['Q', 'VT', 'MOS', 'FET', 'TR'].includes(prefix)) return 'transistor';
  if (['U', 'IC'].includes(prefix)) return 'logic';
  if (['J', 'P', 'CONN', 'CN', 'HEADER', 'TERM'].includes(prefix)) return 'connector';
  if (['SW', 'S', 'BTN', 'BUTTON', 'KEY', 'RESET'].includes(prefix)) return 'switch';
  if (['Y', 'X', 'XTAL', 'OSC'].includes(prefix)) return 'quartz';
  if (['F', 'FUSE'].includes(prefix)) return 'fuse';
  if (['K', 'RL', 'RELAY'].includes(prefix)) return 'relay';
  if (['BZ', 'SPK', 'BUZ', 'SPEAKER'].includes(prefix)) return 'buzzer';

  // 2. Fallback to value and footprint keywords
  const combined = `${val} ${footprint}`.toLowerCase();
  if (combined.includes('tact') || combined.includes('push') || combined.includes('button') || combined.includes('switch')) {
    return 'switch';
  }
  if (combined.includes('led')) return 'led';
  if (combined.includes('conn') || combined.includes('header') || combined.includes('socket')) return 'connector';
  if (combined.includes('crystal') || combined.includes('oscillator') || combined.includes('xtal')) return 'quartz';
  if (combined.includes('fuse')) return 'fuse';
  if (combined.includes('relay')) return 'relay';
  if (combined.includes('resistor') || /^\d+[kMmrR]?\d*(?:ohm|kR|R|k|M)?$/i.test(val.trim())) return 'resistor';
  if (combined.includes('capacitor') || /^\d+(?:\.\d+)?(?:p|n|u|m)?F$/i.test(val.trim())) return 'capacitor';

  return null;
}

function inferCategoryFromRef(ref) {
  return inferCategory(ref);
}

/**
 * Extract clean package name from KiCAD footprint string
 * Handles imperial SMD sizes, metric conversions, IC types, diodes, etc.
 * E.g., 'Capacitor_SMD:C_0805_2012Metric_Pad1.15x1.40mm_HandSolder' -> '0805'
 * 'SO-20_12.8x7.5mm_P1.27mm' -> 'SO-20'
 */
function cleanFootprintName(footprint) {
  if (!footprint) return '';
  // Strip KiCAD library prefix e.g. "Resistor_SMD:"
  let clean = footprint.includes(':') ? footprint.split(':')[1] : footprint;

  // 1. SMD Passive sizes (01005, 0201, 0402, 0603, 0805, 1206, 1210, 1808, 1812, 2010, 2512)
  const smdMatch = clean.match(/(?:^|[^0-9a-zA-Z])(01005|0201|0402|0603|0805|1206|1210|1808|1812|2010|2512)(?:[^0-9a-zA-Z]|$)/i);
  if (smdMatch) return smdMatch[1];

  // Metric passive fallback (e.g. 2012Metric -> 0805, 1608Metric -> 0603)
  const metricMatch = clean.match(/(?:^|[^0-9a-zA-Z])(1005|1608|2012|3216|3225)Metric/i);
  if (metricMatch) {
    const metricMap = { '1005': '0402', '1608': '0603', '2012': '0805', '3216': '1206', '3225': '1210' };
    if (metricMap[metricMatch[1]]) return metricMap[metricMatch[1]];
  }

  // 2. Standard IC / Discrete Packages
  const dip = clean.match(/(?:^|[^0-9a-zA-Z])(DIP-?\d+)(?:[^0-9a-zA-Z]|$)/i);
  if (dip) return dip[1].toUpperCase().replace(/^DIP-?/, 'DIP-');

  const soic = clean.match(/(?:^|[^0-9a-zA-Z])(SOIC-?\d+[A-Z]?|SOP-?\d+[A-Z]?|SO-?\d+[A-Z]?|SSOP-?\d+[A-Z]?|TSSOP-?\d+[A-Z]?|MSOP-?\d+[A-Z]?)(?:[^0-9a-zA-Z]|$)/i);
  if (soic) return soic[1].toUpperCase();

  const sot = clean.match(/(?:^|[^0-9a-zA-Z])(SOT-?\d+(?:-\d+[A-Z]?)?)/i);
  if (sot) return sot[1].toUpperCase();

  const to = clean.match(/(?:^|[^0-9a-zA-Z])(TO-?\d+(?:-\d+)?|DPAK|D2PAK)/i);
  if (to) return to[1].toUpperCase();

  const qfp = clean.match(/(?:^|[^0-9a-zA-Z])(LQFP-?\d+|TQFP-?\d+|QFP-?\d+|EQFP-?\d+)/i);
  if (qfp) return qfp[1].toUpperCase();

  const qfn = clean.match(/(?:^|[^0-9a-zA-Z])(QFN-?\d+|DFN-?\d+|UQFN-?\d+|X2QFN-?\d+)/i);
  if (qfn) return qfn[1].toUpperCase();

  const diode = clean.match(/(?:^|[^0-9a-zA-Z])(SOD-?\d+|SMA|SMB|SMC|DO-?\d+[A-Z]*)/i);
  if (diode) return diode[1].toUpperCase();

  const crystal = clean.match(/(?:^|[^0-9a-zA-Z])(HC-49[A-Z0-9]*|3225|5032)/i);
  if (crystal) return crystal[1].toUpperCase();

  // 3. Strip common KiCAD suffixes: _Pad..., _HandSolder, dimensions, etc.
  let general = clean
    .replace(/_Pad[\d.x]+mm.*/i, '')
    .replace(/_HandSolder.*/i, '')
    .replace(/_[\d.]+x[\d.]+mm.*/i, '')
    .replace(/_P[\d.]+mm.*/i, '')
    .replace(/_ThermalVias.*/i, '')
    .replace(/_EP.*/i, '');

  // Guard against truncating down to 1-2 letters (like 'C', 'R', 'SW')
  if (general.length <= 2 && clean.length > 2) {
    general = clean.split(':')[clean.split(':').length - 1];
  }

  return general || footprint;
}

/**
 * Robustly extract a JSON object from a string starting at/after startIndex
 * using balanced brace counting, immune to regex backtrack limits on large files.
 */
function extractJsonObject(source, startIndex = 0) {
  const openBrace = source.indexOf('{', startIndex);
  if (openBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const jsonStr = source.substring(openBrace, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.error('JSON.parse failed in extractJsonObject:', e.message);
            return null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * If the user saved the file directly from a GitHub blob view page,
 * extract the raw HTML file contents embedded in GitHub's react-app.embeddedData.
 */
function unwrapGitHubHtml(htmlContent) {
  if (typeof htmlContent !== 'string') return htmlContent;
  const scriptMarker = '<script type="application/json" data-target="react-app.embeddedData">';
  const scriptStart = htmlContent.indexOf(scriptMarker);
  if (scriptStart !== -1) {
    const bodyStart = htmlContent.indexOf('>', scriptStart) + 1;
    const bodyEnd = htmlContent.indexOf('</script>', bodyStart);
    if (bodyEnd > bodyStart) {
      try {
        const jsonText = htmlContent.substring(bodyStart, bodyEnd);
        const data = JSON.parse(jsonText);
        const rawLines = data.payload?.['codeViewBlobLayoutRoute.StyledBlob']?.rawLines 
                      || data.payload?.codeViewBlobLayoutRoute?.blob?.rawLines
                      || data.payload?.blob?.rawLines;
        if (Array.isArray(rawLines) && rawLines.length > 0) {
          return rawLines.join('\n');
        }
      } catch (e) {
        console.warn('Failed to unwrap GitHub embeddedData:', e.message);
      }
    }
  }
  return htmlContent;
}

/**
 * Normalize electronic component value strings for consistent comparison
 * E.g., '10kR' -> '10 kOhm', '100nF' -> '100 nF', '10uF' -> '10 uF'
 */
function normalizeValue(val) {
  if (!val) return '';
  let s = val.trim();
  s = s.replace(/^(\d+)kR$/i, (m, p1) => `${p1} kOhm`);
  s = s.replace(/^(\d+)R$/i, (m, p1) => `${p1} Ohm`);
  s = s.replace(/^(\d+)k(\d+)$/i, (m, p1, p2) => `${p1}.${p2} kOhm`);
  s = s.replace(/^(\d+)k$/i, (m, p1) => `${p1} kOhm`);
  s = s.replace(/^(\d+)M$/i, (m, p1) => `${p1} MOhm`);
  s = s.replace(/^(\d+)M(\d+)$/i, (m, p1, p2) => `${p1}.${p2} MOhm`);
  s = s.replace(/^(\d+(?:\.\d+)?)\s*(p|n|u|m|µ)F?$/i, (m, num, unit) => {
    const u = unit === 'µ' ? 'u' : unit.toLowerCase();
    return `${num} ${u}F`;
  });
  return s;
}

/**
 * Intelligently find a matching package from the database package catalog
 */
function findMatchingPackage(targetFootprint, packages) {
  if (!targetFootprint || !Array.isArray(packages)) return null;
  const target = targetFootprint.toLowerCase().trim();

  // 1. Exact match
  let matched = packages.find(p => p.package.toLowerCase() === target);
  if (matched) return matched.ID;

  // 2. Normalized match (strip hyphens and underscores)
  const normTarget = target.replace(/[-_]/g, '');
  matched = packages.find(p => p.package.toLowerCase().replace(/[-_]/g, '') === normTarget);
  if (matched) return matched.ID;

  // 3. SO <-> SOIC / SOP equivalence (e.g. SO-20 -> SOIC-20 or SOP-20)
  if (/^so-?\d+/i.test(target)) {
    const pinCount = target.match(/\d+/)?.[0];
    if (pinCount) {
      matched = packages.find(p => {
        const pNorm = p.package.toUpperCase();
        return pNorm === `SOIC-${pinCount}` || pNorm === `SOIC${pinCount}`;
      }) || packages.find(p => {
        const pNorm = p.package.toUpperCase();
        return pNorm === `SO-${pinCount}` || pNorm === `SOP-${pinCount}`;
      });
      if (matched) return matched.ID;
    }
  }

  // 4. SOIC-XXW (wide) -> SOIC-XX
  if (/^soic-?\d+w/i.test(target)) {
    const pinCount = target.match(/\d+/)?.[0];
    matched = packages.find(p => p.package.toUpperCase() === `SOIC-${pinCount}`);
    if (matched) return matched.ID;
  }

  // 5. DIP equivalence (e.g. DIP14 -> DIP-14 or DIP-04 -> DIP-4)
  if (/^dip-?\d+/i.test(target)) {
    const num = parseInt(target.match(/\d+/)?.[0], 10);
    matched = packages.find(p => {
      const pNum = parseInt(p.package.match(/\d+/)?.[0], 10);
      return p.package.toLowerCase().startsWith('dip') && pNum === num;
    });
    if (matched) return matched.ID;
  }

  // 6. Substring match only for specific known package families (min length 4)
  if (target.length >= 4) {
    matched = packages.find(p => {
      const pLower = p.package.toLowerCase();
      return pLower.includes(target) || target.includes(pLower);
    });
    if (matched) return matched.ID;
  }

  return null;
}

/**
 * Extract reference designator letter prefix (e.g., 'R1' -> 'R', 'RN2' -> 'RN')
 */
function getRefPrefix(ref = '') {
  const clean = (ref || '').replace(/^[^a-zA-Z]+/, '');
  return (clean.match(/^[A-Za-z]+/)?.[0] || '').toUpperCase();
}

/**
 * Naturally sort reference designators (e.g. R1, R2, R10 instead of R1, R10, R2)
 */
function sortDesignators(refs) {
  if (!Array.isArray(refs)) return [];
  const unique = Array.from(new Set(refs.filter(Boolean)));
  return unique.sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Consolidate BOM rows that point to the same physical component
 * E.g., multiple rows with identical normalized value, cleaned footprint, category, and MPN
 * (which commonly occur in KiCAD when footprints have minor pad or solder variations like Pad1.15x1.40mm vs Pad1.20x1.40mm)
 */
function consolidateItems(rawItems) {
  const consolidated = [];
  const keyIndexMap = new Map();

  rawItems.forEach(item => {
    const normVal = normalizeValue(item.value).toLowerCase().trim();
    const cleanFp = (item.cleanedFootprint || '').toLowerCase().trim();
    const cat = (item.suggestedCategory || '').toLowerCase().trim();
    const mpn = (item.mpn || '').toLowerCase().trim();
    const mfr = (item.manufacturer || '').toLowerCase().trim();
    const prefix = getRefPrefix(item.firstRef);

    // Only consolidate if there is a discernible value or MPN
    const canConsolidate = Boolean(normVal || mpn);
    const key = canConsolidate ? [prefix, cat, normVal, cleanFp, mpn, mfr].join(':::') : null;

    if (key && keyIndexMap.has(key)) {
      const existing = consolidated[keyIndexMap.get(key)];
      existing.quantity += item.quantity;
      const combinedRefs = sortDesignators([...existing.designatorList, ...item.designatorList]);
      existing.designatorList = combinedRefs;
      existing.designators = combinedRefs.join(', ');
      existing.firstRef = combinedRefs[0] || '';
      existing.extra = { ...item.extra, ...existing.extra };
      if (!existing.mpn && item.mpn) existing.mpn = item.mpn;
      if (!existing.manufacturer && item.manufacturer) existing.manufacturer = item.manufacturer;
    } else {
      const cloned = {
        ...item,
        designatorList: sortDesignators(item.designatorList || [])
      };
      cloned.designators = cloned.designatorList.join(', ');
      cloned.firstRef = cloned.designatorList[0] || '';

      const newIdx = consolidated.length;
      if (key) {
        keyIndexMap.set(key, newIdx);
      }
      consolidated.push(cloned);
    }
  });

  return consolidated.map((item, idx) => ({
    ...item,
    index: idx + 1
  }));
}

/**
 * Parse an ibom.html string generated by KiCAD InteractiveHtmlBom plugin
 */
function parseIbomHtml(rawHtmlContent) {
  if (!rawHtmlContent || typeof rawHtmlContent !== 'string') {
    throw new Error('Invalid HTML content provided');
  }

  // Unwrap if saved from a GitHub blob page
  const htmlContent = unwrapGitHubHtml(rawHtmlContent);

  // 1. Extract config
  let config = {};
  let cfgIdx = htmlContent.indexOf('var config');
  if (cfgIdx === -1) {
    const m = htmlContent.match(/(?:var|let|const|window\.)?\s*config\s*=/);
    if (m) cfgIdx = m.index;
  }

  if (cfgIdx !== -1) {
    config = extractJsonObject(htmlContent, cfgIdx) || {};
  } else {
    const fallbackConfig = htmlContent.match(/var\s+config\s*=\s*(\{.+?\})/);
    if (fallbackConfig) {
      try { config = JSON.parse(fallbackConfig[1]); } catch (_) {}
    }
  }

  // 2. Extract pcbdata (compressed or uncompressed)
  let pcbdata = null;
  const lzMatch = htmlContent.match(/LZString\.decompressFromBase64\s*\(\s*["']([^"']+)["']\s*\)/);
  if (lzMatch) {
    const decompressed = LZString.decompressFromBase64(lzMatch[1]);
    if (!decompressed) {
      throw new Error('Failed to decompress LZString in iBOM file');
    }
    pcbdata = JSON.parse(decompressed);
  } else {
    let pcbIdx = htmlContent.indexOf('var pcbdata');
    if (pcbIdx === -1) {
      const m = htmlContent.match(/(?:var|let|const|window\.)?\s*pcbdata\s*=/);
      if (m) pcbIdx = m.index;
    }
    if (pcbIdx !== -1) {
      pcbdata = extractJsonObject(htmlContent, pcbIdx);
    }
  }

  if (!pcbdata) {
    throw new Error('Could not find or parse pcbdata in iBOM file');
  }

  const metadata = pcbdata.metadata || {};
  const fieldNames = config.fields || config.extra_fields || ['Value', 'Footprint'];
  const bomGroups = pcbdata.bom?.both || (
    (pcbdata.bom?.F || pcbdata.bom?.B) 
      ? [...(pcbdata.bom?.F || []), ...(pcbdata.bom?.B || [])] 
      : []
  );
  const footprintsList = pcbdata.footprints || pcbdata.modules || [];
  const items = [];

  const valIdx = fieldNames.findIndex(f => f && f.toLowerCase() === 'value');
  const fpIdx = fieldNames.findIndex(f => f && f.toLowerCase() === 'footprint');

  bomGroups.forEach((row, idx) => {
    let qty = 1;
    let val = '';
    let footprint = '';
    let refs = [];
    let extraMap = {};

    // Standard format: [qty, val, footprint, [[ref, id], ...], [extra1, extra2, ...]]
    if (Array.isArray(row) && typeof row[0] === 'number') {
      qty = row[0];
      val = (row[1] || '').trim();
      footprint = (row[2] || '').trim();
      if (Array.isArray(row[3])) {
        refs = row[3].map(item => Array.isArray(item) ? item[0] : item);
      }
      if (Array.isArray(row[4])) {
        row[4].forEach((extraVal, fIdx) => {
          const fname = fieldNames[fIdx] || `Field_${fIdx + 1}`;
          if (extraVal !== undefined && extraVal !== null && String(extraVal).trim()) {
            extraMap[fname] = String(extraVal).trim();
          }
        });
      }
    } else if (Array.isArray(row)) {
      // Alternate format: [[ref, id], ...]
      refs = row.map(item => Array.isArray(item) ? item[0] : item);
      qty = refs.length;
      const fpIndex = Array.isArray(row[0]) ? row[0][1] : null;

      if (fpIndex !== null && pcbdata.bom?.fields?.[fpIndex]) {
        const fVals = pcbdata.bom.fields[fpIndex];
        val = String((valIdx !== -1 ? fVals[valIdx] : fVals[0]) || '').trim();
        footprint = String((fpIdx !== -1 ? fVals[fpIdx] : fVals[1]) || '').trim();

        fieldNames.forEach((fname, fIdx) => {
          if (fIdx !== valIdx && fIdx !== fpIdx && fVals[fIdx] !== undefined) {
            extraMap[fname] = String(fVals[fIdx]).trim();
          }
        });
      } else if (fpIndex !== null && footprintsList[fpIndex]) {
        const fp = footprintsList[fpIndex];
        val = String(fp.val || '').trim();
        footprint = String(fp.footprint || '').trim();
      }
    }

    const firstRef = refs[0] || '';
    const suggestedCategory = inferCategory(firstRef, val, footprint);
    const cleanedFootprint = cleanFootprintName(footprint);

    // Extract potential MPN / Manufacturer from extra fields if present
    let mpn = '';
    let manufacturer = '';
    for (const [k, v] of Object.entries(extraMap)) {
      const lower = k.toLowerCase();
      if ((lower.includes('part') || lower.includes('mpn') || lower.includes('mfg')) && !lower.includes('supplier')) {
        mpn = v;
      }
      if (lower.includes('manufactur') || lower.includes('brand') || lower.includes('mfr')) {
        manufacturer = v;
      }
    }

    items.push({
      index: idx + 1,
      quantity: qty,
      value: val,
      footprint,
      cleanedFootprint,
      designators: refs.join(', '),
      designatorList: refs,
      firstRef,
      suggestedCategory,
      extra: extraMap,
      mpn,
      manufacturer
    });
  });

  const consolidatedItems = consolidateItems(items);

  return {
    metadata: {
      title: metadata.title || '',
      revision: metadata.revision || '',
      company: metadata.company || '',
      date: metadata.date || '',
      ibomVersion: pcbdata.ibom_version || ''
    },
    itemsCount: consolidatedItems.length,
    totalQuantity: consolidatedItems.reduce((sum, it) => sum + it.quantity, 0),
    items: consolidatedItems
  };
}

/**
 * Match parsed iBOM items against database catalog components, categories, and packages
 */
async function matchComponentsWithDb(parsedItems, pool) {
  // 1. Fetch catalog data
  const [components] = await pool.query(`
    SELECT 
      c.ID, 
      c.component, 
      c.marking, 
      c.description, 
      c.shortDescription, 
      c.qty, 
      c.category_id, 
      c.package_id,
      cat.category,
      pkg.package
    FROM i_components c
    LEFT JOIN i_categories cat ON c.category_id = cat.ID
    LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
  `);

  const [categories] = await pool.query('SELECT ID, category FROM i_categories ORDER BY category ASC');
  const [packages] = await pool.query('SELECT ID, package, isSmd FROM i_packages ORDER BY package ASC');

  // Helper maps
  const catByName = new Map();
  categories.forEach(c => catByName.set(c.category.toLowerCase(), c.ID));

  // 2. Perform intelligent matching for each item
  return parsedItems.map(item => {
    let matched = null;
    let matchConfidence = 'none'; // 'exact', 'suggested', 'none'
    let matchReason = '';

    const targetVal = (item.value || '').toLowerCase().trim();
    const targetMpn = item.mpn ? item.mpn.toLowerCase().trim() : '';
    const normVal = normalizeValue(item.value);
    const targetNormVal = normVal.toLowerCase().trim();

    // Resolve suggested package
    const suggestedPackageId = findMatchingPackage(item.cleanedFootprint, packages);

    // Strategy 1: Exact match by MPN if available
    if (targetMpn) {
      matched = components.find(c => {
        const cComp = (c.component || '').toLowerCase();
        const cMark = (c.marking || '').toLowerCase();
        return cComp === targetMpn || cMark === targetMpn;
      });
      if (matched) {
        matchConfidence = 'exact';
        matchReason = `Matched MPN (${item.mpn})`;
      }
    }

    // Strategy 2: Exact match by Component name
    if (!matched && targetVal) {
      matched = components.find(c => (c.component || '').toLowerCase() === targetVal);
      if (matched) {
        matchConfidence = 'exact';
        matchReason = `Exact part name match (${item.value})`;
      }
    }

    // Strategy 3: Exact / prefix match with matching package (e.g. '100 nF x 50v' in package 0805)
    if (!matched && suggestedPackageId && targetNormVal) {
      const pkgMatches = components.filter(c => c.package_id === suggestedPackageId);
      matched = pkgMatches.find(c => {
        const cComp = (c.component || '').toLowerCase();
        return cComp === targetNormVal 
            || cComp.startsWith(`${targetNormVal} `) 
            || cComp.startsWith(`${targetNormVal}x`);
      });
      if (matched) {
        matchConfidence = 'suggested';
        matchReason = `Value + package match (${matched.component})`;
      }
    }

    // Strategy 4: Match without package constraint if uniquely identified
    if (!matched && targetNormVal) {
      const valCandidates = components.filter(c => {
        const cComp = (c.component || '').toLowerCase();
        return cComp === targetNormVal || cComp.startsWith(`${targetNormVal} `);
      });
      if (valCandidates.length === 1) {
        matched = valCandidates[0];
        matchConfidence = 'suggested';
        matchReason = `Value match (${matched.component})`;
      }
    }

    // Strategy 5: Match by marking
    if (!matched && targetVal) {
      matched = components.find(c => {
        const cMark = (c.marking || '').toLowerCase();
        return cMark === targetVal;
      });
      if (matched) {
        matchConfidence = 'suggested';
        matchReason = `Marking code match (${item.value})`;
      }
    }

    // Strategy 6: Fuzzy / substring in component name
    if (!matched && targetVal && targetVal.length >= 4) {
      const candidates = components.filter(c => {
        const cComp = (c.component || '').toLowerCase();
        return cComp.includes(targetVal) || targetVal.includes(cComp);
      });

      if (candidates.length === 1) {
        matched = candidates[0];
        matchConfidence = 'suggested';
        matchReason = `Suggested candidate (${matched.component})`;
      }
    }

    // Resolve suggested category ID
    let suggestedCategoryId = null;
    if (item.suggestedCategory) {
      const combined = `${item.value} ${item.footprint}`.toLowerCase();
      // Refine tactile switch
      if (item.suggestedCategory === 'switch' && combined.includes('tact') && catByName.has('switch - tact key')) {
        suggestedCategoryId = catByName.get('switch - tact key');
      } else if (catByName.has(item.suggestedCategory)) {
        suggestedCategoryId = catByName.get(item.suggestedCategory);
      }
    }

    return {
      ...item,
      normalizedValue: normVal,
      matchedComponent: matched ? {
        ID: matched.ID,
        component: matched.component,
        marking: matched.marking,
        category: matched.category,
        package: matched.package,
        qty: matched.qty,
        shortDescription: matched.shortDescription
      } : null,
      matchConfidence,
      matchReason,
      suggestedCategoryId,
      suggestedPackageId
    };
  });
}

module.exports = {
  inferCategory,
  inferCategoryFromRef,
  cleanFootprintName,
  normalizeValue,
  findMatchingPackage,
  extractJsonObject,
  unwrapGitHubHtml,
  parseIbomHtml,
  matchComponentsWithDb,
  sortDesignators,
  consolidateItems
};
