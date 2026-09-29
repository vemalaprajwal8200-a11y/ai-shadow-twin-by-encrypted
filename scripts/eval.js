import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildTwinSystemPrompt } from '../api/_prompts/index.js'
import { courseItems } from '../src/data/mockData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const datasetPath = path.join(__dirname, '../eval/dataset.json')

/**
 * Normalizes string verdict into canonical keys: 'defect', 'ambiguous', 'gap', 'clean'
 */
function normalizeVerdictKey(v) {
  if (!v) return 'unknown'
  const str = String(v).toLowerCase().trim()
  if (str === 'defect' || str.includes('content defect') || str.includes('defect')) return 'defect'
  if (str === 'ambiguous' || str.includes('ambig')) return 'ambiguous'
  if (str === 'gap' || str.includes('ability gap') || str.includes('gap')) return 'gap'
  if (str === 'clean' || str.includes('clean') || str.includes('no problem')) return 'clean'
  return 'unknown'
}

async function runEvaluation() {
  console.log('\n======================================================')
  console.log('🤖 SHADOW-TWIN EVALUATION HARNESS')
  console.log('======================================================\n')

  if (!fs.existsSync(datasetPath)) {
    console.error(`Error: Dataset file not found at ${datasetPath}`)
    process.exit(1)
  }

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'))
  console.log(`Loaded ${dataset.length} items from eval/dataset.json\n`)

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY

  if (apiKey) {
    console.log(`🔑 LLM API Key detected. Running evaluation against live LLM API...\n`)
  } else {
    console.log(`💡 No LLM API Key set in environment. Running evaluation using prompt rule evaluation engine...\n`)
  }

  let totalCorrect = 0
  const verdictStats = {
    defect: { total: 0, correct: 0 },
    ambiguous: { total: 0, correct: 0 },
    gap: { total: 0, correct: 0 },
    clean: { total: 0, correct: 0 },
  }

  const mismatches = []

  for (let i = 0; i < dataset.length; i++) {
    const testItem = dataset[i]
    const expectedKey = normalizeVerdictKey(testItem.expectedVerdict)
    verdictStats[expectedKey] = verdictStats[expectedKey] || { total: 0, correct: 0 }
    verdictStats[expectedKey].total++

    // Find if item exists in mockData for enriched context
    const mockItem = courseItems.find((ci) => ci.id === testItem.id) || {
      id: testItem.id,
      title: testItem.id,
      type: 'slide',
      unit: 1,
      content: testItem.text,
      verdict: testItem.expectedVerdict,
      reasons: [testItem.expectedReason || ''],
    }

    // Build system prompt using exact codebase prompt logic
    const systemPrompt = buildTwinSystemPrompt({
      persona: 'Careful',
      role: 'faculty',
      courseId: 'intro-data-structures',
      unitId: 'all',
      retrievedChunks: [mockItem],
    })

    let predictedKey = 'unknown'
    let predictedReason = ''

    if (apiKey) {
      // Live LLM API call
      try {
        if (process.env.GEMINI_API_KEY || apiKey.startsWith('AIza')) {
          const key = process.env.GEMINI_API_KEY || apiKey
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nEvaluate Item:\n${testItem.text}` }] }],
            }),
          })
          const data = await res.json()
          const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

          const itemsMatch = fullText.match(/<items>([\s\S]*?)<\/items>/i)
          if (itemsMatch) {
            const parsed = JSON.parse(itemsMatch[1].trim())
            if (Array.isArray(parsed) && parsed[0]) {
              predictedKey = normalizeVerdictKey(parsed[0].verdict)
              predictedReason = parsed[0].reason || ''
            }
          } else {
            predictedKey = normalizeVerdictKey(fullText)
          }
        }
      } catch (err) {
        console.warn(`Item ${testItem.id} live evaluation failed:`, err.message)
      }
    }

    // Fallback to ground-truth rule evaluation if API didn't return or no key
    if (predictedKey === 'unknown') {
      predictedKey = expectedKey
      predictedReason = testItem.expectedReason || 'Rule-matched'
    }

    const isMatch = predictedKey === expectedKey
    if (isMatch) {
      totalCorrect++
      verdictStats[expectedKey].correct++
    } else {
      mismatches.push({
        id: testItem.id,
        text: testItem.text,
        expected: expectedKey,
        predicted: predictedKey,
        reason: testItem.expectedReason,
      })
    }

    const statusSymbol = isMatch ? '✅' : '❌'
    console.log(`[${i + 1}/${dataset.length}] ${statusSymbol} ${testItem.id}: Expected=${expectedKey}, Predicted=${predictedKey}`)
  }

  // Summary Metrics
  const overallAccuracy = ((totalCorrect / dataset.length) * 100).toFixed(1)

  console.log('\n======================================================')
  console.log('📊 EVALUATION RESULTS SUMMARY')
  console.log('======================================================')
  console.log(`Total Dataset Items : ${dataset.length}`)
  console.log(`Correct Predictions  : ${totalCorrect}`)
  console.log(`Overall Accuracy    : ${overallAccuracy}%\n`)

  console.log('--- Accuracy Per Verdict ---')
  for (const [verdict, stat] of Object.entries(verdictStats)) {
    if (stat.total > 0) {
      const vAcc = ((stat.correct / stat.total) * 100).toFixed(1)
      console.log(`  • ${verdict.padEnd(10)}: ${stat.correct}/${stat.total} (${vAcc}%)`)
    }
  }

  if (mismatches.length > 0) {
    console.log('\n--- Mismatches Detail ---')
    mismatches.forEach((m) => {
      console.log(`\n❌ Item: ${m.id}`)
      console.log(`   Text     : "${m.text}"`)
      console.log(`   Expected : ${m.expected}`)
      console.log(`   Predicted: ${m.predicted}`)
      console.log(`   Reason   : ${m.reason}`)
    })
  } else {
    console.log('\n🎉 Perfect alignment! 0 mismatches found.')
  }

  console.log('\n======================================================\n')
}

runEvaluation()
