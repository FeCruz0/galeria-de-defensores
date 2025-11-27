package com.galeria.defensores.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.data.SessionManager
import com.galeria.defensores.data.TableRepository
import com.galeria.defensores.data.UserRepository
import com.galeria.defensores.models.Table
import com.google.android.material.floatingactionbutton.FloatingActionButton

class TableListFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_table_list, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val recyclerView = view.findViewById<RecyclerView>(R.id.recycler_tables)
        recyclerView.layoutManager = LinearLayoutManager(context)

        fun loadTables() {
            val currentUser = SessionManager.currentUser
            val adapter = TablesAdapter(
                tables = TableRepository.getTables(),
                currentUserId = currentUser?.id,
                onTableClick = { table ->
                    // Navigate to CharacterListFragment with tableId
                    val fragment = CharacterListFragment.newInstance(table.id)
                    parentFragmentManager.beginTransaction()
                        .replace(R.id.fragment_container, fragment)
                        .addToBackStack(null)
                        .commit()
                },
                onInviteClick = { table ->
                    showInviteDialog(table)
                }
            )
            recyclerView.adapter = adapter
        }

        loadTables()

        view.findViewById<FloatingActionButton>(R.id.fab_add_table).setOnClickListener {
            showAddTableDialog {
                loadTables()
            }
        }

        view.findViewById<View>(R.id.btn_settings).setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, SettingsFragment())
                .addToBackStack(null)
                .commit()
        }
    }

    private fun showInviteDialog(table: Table) {
        val input = EditText(context)
        input.hint = "Telefone do Convidado"
        input.inputType = android.text.InputType.TYPE_CLASS_PHONE
        
        AlertDialog.Builder(requireContext())
            .setTitle("Convidar Jogador")
            .setView(input)
            .setPositiveButton("Convidar") { _, _ ->
                val phone = input.text.toString()
                if (phone.isNotBlank()) {
                    val user = UserRepository.findUserByPhone(phone)
                    if (user != null) {
                        // User exists, add to table
                        TableRepository.addPlayerToTable(table.id, user.id)
                        android.widget.Toast.makeText(context, "${user.name} adicionado à mesa!", android.widget.Toast.LENGTH_SHORT).show()
                    } else {
                        // User not found, generate code
                        val inviteCode = java.util.UUID.randomUUID().toString().substring(0, 6).uppercase()
                        android.widget.Toast.makeText(context, "Usuário não encontrado. Código de convite: $inviteCode", android.widget.Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showAddTableDialog(onTableAdded: () -> Unit) {
        val input = EditText(context)
        input.hint = "Nome da Mesa"
        
        AlertDialog.Builder(requireContext())
            .setTitle("Nova Mesa")
            .setView(input)
            .setPositiveButton("Criar") { _, _ ->
                val name = input.text.toString()
                if (name.isNotBlank()) {
                    val currentUser = SessionManager.currentUser
                    if (currentUser != null) {
                        val newTable = Table(name = name, masterId = currentUser.id)
                        TableRepository.addTable(newTable)
                        onTableAdded()
                    }
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}
