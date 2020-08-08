const getAppElements = () => ({
    input: document.getElementById('input'),
    result: {
        selectionPosition: document.getElementById('selection-position'),
        all: document.getElementById('all'),
        saveAllButton: document.getElementById('save-all')
    }
})

const splitByArray = (input, separators) => {
    const res = Array.from(input).reduce((current, char) => {
        if (separators.includes(char)) {
            return [...current, []]
        }
        const next = [...current.slice(0, current.length-1), [...current[current.length-1], char]]
        return next
    }, [[]])
    const joined = res.map(chars => chars.join(''))
    return joined
}

const extractSentences = (input, { paragraphSeps = ['\n'], sentenceSeps = ['.', '?'] } = {}) => {
    if (paragraphSeps.some(s => s.length != 1) || sentenceSeps.some(s => s.length != 1)) throw new Error('separator must be charactor')
    const raw = splitByArray(input, paragraphSeps).map(p => splitByArray(p, sentenceSeps))
        .map((sentences, paragraphIndex, allSentencesOfParagraphs) =>
            sentences
                .map((content, sentenceIndex) => {
                    const sentencesBeforeCurrent = allSentencesOfParagraphs
                        .slice(0, paragraphIndex + 1)
                        .map((sentences, mappingParagraphIndex) => {
                            if (mappingParagraphIndex !== paragraphIndex) return sentences
                            return sentences.slice(0, sentenceIndex)
                        })
                        .filter(s => s.length)
                    return {
                        pos: sentencesBeforeCurrent.length ?
                            // +1 == 前の文についてる sep
                            sentencesBeforeCurrent.map(sentences => sentences.join(" ")).join(" ").length + 1 :
                            // 開始地点なら 1 ではなく 0
                            0,
                        content: content,
                    }
                })
        )
    const exceptEmptyParagraph = raw.map(sentences => sentences.filter(s => s.content.trim().length)).filter(sentences => sentences.length)
    const withSep = exceptEmptyParagraph.map(sentences => sentences.map(({ content, pos }) => {
        return { pos, content: input.substr(pos, content.length+1) }
    }))
    return withSep
}

const main = async () => {
    const elements = getAppElements()
    elements.input.value = ''
    var sentences = [];
    const onChange = (value) => {
        if (!value.trim().length) {
            sentences = []
            elements.result.all.innerText = ''
            elements.result.selectionPosition.innerText = ''
            return
        }
        sentences = extractSentences(value)
        console.dir(sentences)
        const tsv = sentences.map((sentences, pPos) =>
            sentences.map((sentence, sPos) => [`P.${pPos+1}`, `S.${sPos+1}`, sentence.content.trim()].join('\t'))
                .join('\n')
        ).join('\n')
        console.log(tsv)
        elements.result.all.innerText = tsv
    }
    const onSelect = (pos) => {
        const pPosNext = sentences.map(([firstSentence]) => firstSentence.pos).findIndex(paragraphPos => paragraphPos > pos)
        const pPos = pPosNext === -1 ? sentences.length - 1 : pPosNext - 1
        console.log(pPos, sentences.length)
        const sPosNext = sentences[pPos].findIndex(({ pos: sentencePos }) => sentencePos > pos)
        const sPos = sPosNext === -1 ? sentences[pPos].length - 1 : sPosNext - 1
        console.log(sPos, sentences[pPos])
        const s = `(P.${pPos+1}, S.${sPos+1})`
        elements.result.selectionPosition.innerText = s
    }
    elements.input.addEventListener('change', (e) => onChange(e.target.value))
    elements.input.addEventListener('select', (e) => onSelect(e.target.selectionStart))
    elements.result.saveAllButton.addEventListener('click', e => {
        e.preventDefault()
        const tsv = elements.result.all.innerText
        if (!tsv.trim().length) return
        const encoded = `data:text/tab-separated-values;base64,${btoa(tsv)}`
        const link = document.createElement("a");
        link.download = `${Date.now()}.tsv`;
        link.href = encoded;
        link.style = 'width: 1px; height: 1px'
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        delete link;
    })
    return
}

(async () => {
    try {
        await main()
    } catch (e) {
        console.error(e)
    }
})()
