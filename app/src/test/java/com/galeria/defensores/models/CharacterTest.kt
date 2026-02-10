package com.galeria.defensores.models

import org.junit.Test
import org.junit.Assert.assertEquals

class CharacterTest {

    @Test
    fun `getMaxPv should return resistencia times 5`() {
        val character = Character(resistencia = 3)
        assertEquals(15, character.getMaxPv())
    }

    @Test
    fun `getMaxPv should return at least 1`() {
        val character = Character(resistencia = 0)
        assertEquals(1, character.getMaxPv())
    }

    @Test
    fun `calculateScore should sum all attributes and costs`() {
        val character = Character(
            forca = 1,
            habilidade = 2,
            resistencia = 3,
            armadura = 1,
            poderFogo = 0,
            savedPoints = 2
        )

        character.vantagens.add(AdvantageItem(cost = "2"))
        character.desvantagens.add(AdvantageItem(cost = "-1")) // Desvantagens cost negative
        character.pericias.add(AdvantageItem(cost = "1"))

        // 3 especializações = 1 ponto
        character.especializacoes.add(AdvantageItem())
        character.especializacoes.add(AdvantageItem())
        character.especializacoes.add(AdvantageItem())

        // attrSum: 1+2+3+1+0 = 7
        // advantagesSum: 2 (desvantagens are NOT included in advantagesSum in current logic? Let's check logic)
        // val advantagesSum = vantagens.sumOf { it.cost.toIntOrNull() ?: 0 } -> Yes, only vantagens.
        // skillsSum: 1
        // specsSum: 3/3 = 1
        // savedPoints: 2
        // total: 7 + 2 + 1 + 1 + 2 = 13

        assertEquals(13, character.calculateScore())
    }

    @Test
    fun `calculateScore should include unique advantage cost`() {
        val character = Character(forca = 5)
        character.uniqueAdvantage = UniqueAdvantage(name = "Lobisomem", cost = 2)

        // 5 + 2 = 7
        assertEquals(7, character.calculateScore())
    }
}
