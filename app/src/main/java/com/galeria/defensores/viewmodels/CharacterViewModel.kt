package com.galeria.defensores.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.galeria.defensores.data.CharacterRepository
import com.galeria.defensores.models.Character
import com.galeria.defensores.models.RollResult
import com.galeria.defensores.models.RollType
import kotlin.math.max
import kotlin.random.Random

class CharacterViewModel : ViewModel() {

    private val _character = MutableLiveData<Character>()
    val character: LiveData<Character> = _character

    private val _lastRoll = MutableLiveData<RollResult?>()
    val lastRoll: LiveData<RollResult?> = _lastRoll

    fun loadCharacter(id: String?) {
        if (id != null) {
            val char = CharacterRepository.getCharacter(id)
            if (char != null) {
                _character.value = char
                return
            }
        }
        // Default new character if ID not found or null
        _character.value = Character()
    }

    fun saveCharacter() {
        _character.value?.let {
            CharacterRepository.saveCharacter(it)
        }
    }

    fun updateAttribute(attribute: String, value: Int) {
        val currentChar = _character.value ?: return
        val newValue = value.coerceIn(0, 99)
        
        when (attribute) {
            "forca" -> currentChar.forca = newValue
            "habilidade" -> currentChar.habilidade = newValue
            "resistencia" -> currentChar.resistencia = newValue
            "armadura" -> currentChar.armadura = newValue
            "poderFogo" -> currentChar.poderFogo = newValue
        }
        
        // Update derived stats if Resistencia changed
        if (attribute == "resistencia") {
            // Logic to auto-update max PV/PM could go here, 
            // but usually we just cap current if it exceeds max in the UI or next update
        }
        
        _character.value = currentChar // Trigger LiveData update
        saveCharacter()
    }

    fun updateStatus(type: String, delta: Int) {
        val currentChar = _character.value ?: return
        
        if (type == "pv") {
            val maxPv = currentChar.getMaxPv()
            currentChar.currentPv = (currentChar.currentPv + delta).coerceIn(0, maxPv)
        } else if (type == "pm") {
            val maxPm = currentChar.getMaxPm()
            currentChar.currentPm = (currentChar.currentPm + delta).coerceIn(0, maxPm)
        }
        
        _character.value = currentChar
        saveCharacter()
    }

    fun updateName(name: String) {
        val currentChar = _character.value ?: return
        currentChar.name = name
        _character.value = currentChar
        saveCharacter()
    }

    fun rollDice(type: RollType) {
        val char = _character.value ?: return
        
        var bonus = 0
        var isSpecial = false

        if (type == RollType.SPECIAL_F || type == RollType.SPECIAL_PDF) {
            if (char.currentPm < 1) {
                // TODO: Signal error (not enough PM)
                return
            }
            char.currentPm -= 1
            bonus = 2
            isSpecial = true
            _character.value = char // Update UI for PM change
        }

        val die = Random.nextInt(6) + 1
        val isCritical = die == 6
        
        var attrVal = 0
        var displayAttr = ""

        when (type) {
            RollType.ATTACK_F, RollType.SPECIAL_F -> {
                attrVal = char.forca
                displayAttr = "Força"
            }
            RollType.ATTACK_PDF, RollType.SPECIAL_PDF -> {
                attrVal = char.poderFogo
                displayAttr = "Poder de Fogo"
            }
            RollType.DEFENSE -> {
                attrVal = char.armadura
                displayAttr = "Armadura"
            }
        }

        val effectiveAttr = if (isCritical) attrVal * 2 else attrVal
        val total = effectiveAttr + char.habilidade + die + bonus

        val result = RollResult(
            total = total,
            die = die,
            attributeUsed = displayAttr,
            attributeValue = attrVal,
            skillValue = char.habilidade,
            bonus = bonus,
            isCritical = isCritical,
            timestamp = System.currentTimeMillis(),
            name = type.displayName
        )

        _lastRoll.value = result
    }
}
