package com.galeria.defensores.data

import com.galeria.defensores.models.AdvantageItem

object AdvantagesRepository {
    private val _advantages = AdvantagesData.defaultAdvantages.toMutableList()
    
    fun getAllAdvantages(): List<AdvantageItem> {
        return _advantages.toList()
    }

    fun addAdvantage(advantage: AdvantageItem) {
        _advantages.add(advantage)
    }

    fun updateAdvantage(advantage: AdvantageItem) {
        val index = _advantages.indexOfFirst { it.id == advantage.id }
        if (index != -1) {
            _advantages[index] = advantage
        }
    }

    fun removeAdvantage(advantage: AdvantageItem) {
        _advantages.removeIf { it.id == advantage.id }
    }
}
