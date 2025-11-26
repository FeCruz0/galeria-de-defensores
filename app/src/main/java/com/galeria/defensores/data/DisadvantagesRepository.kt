package com.galeria.defensores.data

import com.galeria.defensores.models.AdvantageItem

object DisadvantagesRepository {
    private val _disadvantages = DisadvantagesData.defaultDisadvantages.toMutableList()
    
    fun getAllDisadvantages(): List<AdvantageItem> {
        return _disadvantages.toList()
    }

    fun addDisadvantage(disadvantage: AdvantageItem) {
        _disadvantages.add(disadvantage)
    }

    fun updateDisadvantage(disadvantage: AdvantageItem) {
        val index = _disadvantages.indexOfFirst { it.id == disadvantage.id }
        if (index != -1) {
            _disadvantages[index] = disadvantage
        }
    }

    fun removeDisadvantage(disadvantage: AdvantageItem) {
        _disadvantages.removeIf { it.id == disadvantage.id }
    }
}
