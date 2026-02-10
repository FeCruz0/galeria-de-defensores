package com.galeria.defensores.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.galeria.defensores.data.CharacterRepository
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.data.TableRepository
import com.galeria.defensores.data.UserRepository
import com.galeria.defensores.models.Character
import com.galeria.defensores.models.Table
import com.galeria.defensores.models.User
import kotlinx.coroutines.launch

class CharacterListViewModel : ViewModel() {

    private val _characters = MutableLiveData<List<Character>>()
    val characters: LiveData<List<Character>> = _characters

    private val _isMaster = MutableLiveData<Boolean>()
    val isMaster: LiveData<Boolean> = _isMaster

    private val _isMember = MutableLiveData<Boolean>()
    val isMember: LiveData<Boolean> = _isMember

    private val _table = MutableLiveData<Table?>()
    val table: LiveData<Table?> = _table

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _toastMessage = MutableLiveData<String>()
    val toastMessage: LiveData<String> = _toastMessage

    private val _navigateToCharacter = MutableLiveData<com.galeria.defensores.utils.Event<String>>()
    val navigateToCharacter: LiveData<com.galeria.defensores.utils.Event<String>> = _navigateToCharacter

    private var currentTableId: String? = null

    fun loadCharacters(tableId: String?) {
        currentTableId = tableId
        viewModelScope.launch {
            val currentUserId = SessionManager.currentUser?.id ?: return@launch

            if (tableId != null) {
                val tableData = TableRepository.getTable(tableId)
                _table.value = tableData

                val master = tableData?.masterId == currentUserId || tableData?.masterId == "mock-master-id"
                _isMaster.value = master
                _isMember.value = tableData?.players?.contains(currentUserId) == true || master

                val allCharacters = CharacterRepository.getCharacters(tableId)
                val filteredCharacters = if (master) {
                    allCharacters
                } else {
                    allCharacters.filter { !it.isHidden || it.ownerId == currentUserId }
                }

                _characters.value = filteredCharacters.sortedWith(
                    compareByDescending<Character> { it.ownerId == currentUserId }
                        .thenBy { it.name }
                )
            } else {
                _isMaster.value = true
                _isMember.value = true
                val characters = CharacterRepository.getCharacters(null)
                _characters.value = characters
            }
        }
    }

    fun deleteCharacter(characterId: String) {
        viewModelScope.launch {
            val success = CharacterRepository.deleteCharacter(characterId)
            if (success) {
                _toastMessage.value = "Personagem excluído."
                loadCharacters(currentTableId)
            } else {
                _error.value = "Erro ao excluir personagem."
            }
        }
    }

    fun createNewCharacter(tableId: String, ownerId: String, ownerName: String) {
        viewModelScope.launch {
            val newCharacter = Character(
                tableId = tableId,
                ownerId = ownerId,
                ownerName = ownerName,
                name = "Novo Defensor"
            )
            CharacterRepository.saveCharacter(newCharacter)
            loadCharacters(tableId)
            _toastMessage.value = "Novo personagem criado."
            _navigateToCharacter.value = com.galeria.defensores.utils.Event(newCharacter.id)
        }
    }

    fun clearTableHistory(tableId: String) {
        viewModelScope.launch {
            val success = TableRepository.clearRollHistory(tableId)
            if (success) {
                _toastMessage.value = "Histórico limpo com sucesso."
            } else {
                _error.value = "Erro ao limpar histórico."
            }
        }
    }

    suspend fun getPotentialNewMasters(table: Table): List<User> {
        val currentUserId = SessionManager.currentUser?.id ?: ""
        val playerIds = table.players.filter { it != table.masterId && it != currentUserId }
        val players = mutableListOf<User>()
        for (id in playerIds) {
            val user = UserRepository.getUser(id)
            if (user != null) players.add(user)
        }
        return players
    }

    fun transferOwnership(table: Table, newMaster: User) {
        viewModelScope.launch {
            val currentUserId = SessionManager.currentUser?.id ?: ""
            val updatedTable = table.copy(masterId = newMaster.id)
            if (!updatedTable.players.contains(currentUserId)) {
                updatedTable.players.add(currentUserId)
            }

            val success = TableRepository.updateTable(updatedTable)
            if (success) {
                _toastMessage.value = "Titularidade transferida com sucesso."
                loadCharacters(currentTableId)
            } else {
                _error.value = "Erro ao transferir titularidade."
            }
        }
    }
}
