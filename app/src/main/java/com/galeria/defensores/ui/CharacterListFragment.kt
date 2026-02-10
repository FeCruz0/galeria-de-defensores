package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.galeria.defensores.R
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.databinding.FragmentCharacterListBinding
import com.galeria.defensores.models.Character
import com.galeria.defensores.viewmodels.CharacterListViewModel
import kotlinx.coroutines.launch

class CharacterListFragment : Fragment() {

    private var _binding: FragmentCharacterListBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CharacterListViewModel by viewModels()
    private lateinit var adapter: CharacterAdapter
    private var tableId: String? = null
    private var isMenuOpen = false

    companion object {
        private const val ARG_TABLE_ID = "table_id"

        fun newInstance(tableId: String): CharacterListFragment {
            val fragment = CharacterListFragment()
            val args = Bundle()
            args.putString(ARG_TABLE_ID, tableId)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            tableId = it.getString(ARG_TABLE_ID)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCharacterListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupListeners()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = CharacterAdapter(
            characters = emptyList(),
            isMaster = false,
            currentUserId = SessionManager.currentUser?.id,
            onItemClick = { character -> openCharacterSheet(character.id) },
            onDeleteClick = { character -> showDeleteConfirmation(character) }
        )
        binding.characterRecyclerView.layoutManager = LinearLayoutManager(context)
        binding.characterRecyclerView.adapter = adapter
    }

    private fun setupListeners() {
        binding.fabMenu.setOnClickListener {
            toggleFabMenu()
        }

        binding.fabNewSheet.setOnClickListener {
            val currentUser = SessionManager.currentUser
            if (currentUser != null && tableId != null) {
                viewModel.createNewCharacter(tableId!!, currentUser.id, currentUser.name)
                // Note: opening sheet is handled by character list refresh in some cases,
                // but here we might want to wait for the new char ID or just let it refresh.
                // The VM version just refreshes. If we want to AUTO-OPEN, we'd need a different event.
            } else {
                Toast.makeText(context, R.string.error_create_character, Toast.LENGTH_SHORT).show()
            }
            closeFabMenu()
        }

        binding.fabViewPlayers.setOnClickListener {
            tableId?.let {
                val dialog = TablePlayersDialogFragment.newInstance(it)
                dialog.show(parentFragmentManager, "TablePlayersDialog")
            }
            closeFabMenu()
        }

        binding.fabTransferOwnership.setOnClickListener {
            showTransferOwnershipDialog()
            closeFabMenu()
        }

        binding.fabClearHistory.setOnClickListener {
            showClearHistoryConfirmation()
            closeFabMenu()
        }

        binding.btnLogs.setOnClickListener {
            tableId?.let {
                val bottomSheet = RollHistoryBottomSheet(it)
                bottomSheet.show(parentFragmentManager, "RollHistoryBottomSheet")
            } ?: run {
                Toast.makeText(context, R.string.history_not_available, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.characters.observe(viewLifecycleOwner) { characters ->
            adapter.updateData(characters, viewModel.isMaster.value ?: false, SessionManager.currentUser?.id)
        }

        viewModel.isMaster.observe(viewLifecycleOwner) { isMaster ->
            // Update UI based on master status if needed (e.g. visibility of some FABs)
        }

        viewModel.isMember.observe(viewLifecycleOwner) { isMember ->
            val isTable = tableId != null
            if (isTable && !isMember) {
                binding.fabMenu.visibility = View.GONE
                binding.btnLogs.visibility = View.GONE
            } else {
                binding.fabMenu.visibility = View.VISIBLE
                binding.btnLogs.visibility = View.VISIBLE
            }
        }

        viewModel.toastMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            Toast.makeText(context, error, Toast.LENGTH_LONG).show()
        }

        viewModel.navigateToCharacter.observe(viewLifecycleOwner) { event ->
            event.getContentIfNotHandled()?.let { characterId ->
                openCharacterSheet(characterId)
            }
        }
    }

    private fun toggleFabMenu() {
        isMenuOpen = !isMenuOpen
        if (isMenuOpen) {
            binding.layoutFabNewSheet.visibility = View.VISIBLE
            binding.layoutFabViewPlayers.visibility = View.VISIBLE
            if (viewModel.isMaster.value == true) {
                binding.layoutFabTransferOwnership.visibility = View.VISIBLE
                binding.layoutFabClearHistory.visibility = View.VISIBLE
            }
            binding.fabMenu.setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
        } else {
            closeFabMenu()
        }
    }

    private fun closeFabMenu() {
        isMenuOpen = false
        binding.layoutFabNewSheet.visibility = View.GONE
        binding.layoutFabViewPlayers.visibility = View.GONE
        binding.layoutFabTransferOwnership.visibility = View.GONE
        binding.layoutFabClearHistory.visibility = View.GONE
        binding.fabMenu.setImageResource(R.drawable.ic_more_vert)
    }

    private fun showClearHistoryConfirmation() {
        tableId?.let { id ->
            AlertDialog.Builder(requireContext())
                .setTitle(R.string.clear_history_title)
                .setMessage(R.string.clear_history_message)
                .setPositiveButton(R.string.clear_history_confirm) { _, _ ->
                    viewModel.clearTableHistory(id)
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }

    private fun showTransferOwnershipDialog() {
        val table = viewModel.table.value ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            val potentialMasters = viewModel.getPotentialNewMasters(table)
            if (potentialMasters.isEmpty()) {
                Toast.makeText(context, R.string.no_players_transfer, Toast.LENGTH_LONG).show()
                return@launch
            }

            val playerNames = potentialMasters.map { it.name }.toTypedArray()
            AlertDialog.Builder(requireContext())
                .setTitle(R.string.transfer_ownership_title)
                .setItems(playerNames) { _, which ->
                    confirmTransfer(table, potentialMasters[which])
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }

    private fun confirmTransfer(table: com.galeria.defensores.models.Table, newMaster: com.galeria.defensores.models.User) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.confirm_transfer_title)
            .setMessage(getString(R.string.confirm_transfer_message, table.name, newMaster.name))
            .setPositiveButton(R.string.transfer_confirm) { _, _ ->
                viewModel.transferOwnership(table, newMaster)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadCharacters(tableId)
    }

    private fun openCharacterSheet(characterId: String?) {
        val fragment = CharacterSheetFragment.newInstance(characterId, tableId)
        requireActivity().supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, fragment)
            .addToBackStack(null)
            .commit()
    }

    private fun showDeleteConfirmation(character: Character) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.delete_character_title)
            .setMessage(getString(R.string.delete_character_message, character.name))
            .setPositiveButton(R.string.delete_confirm) { _, _ ->
                viewModel.deleteCharacter(character.id)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
