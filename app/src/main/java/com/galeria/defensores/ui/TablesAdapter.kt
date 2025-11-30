package com.galeria.defensores.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.models.Table
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TablesAdapter(
    private val tables: List<Table>,
    private val currentUserId: String?,
    private val onTableClick: (Table) -> Unit,
    private val onInviteClick: (Table) -> Unit,
    private val onEditClick: (Table) -> Unit,
    private val onDeleteClick: (Table) -> Unit
) : RecyclerView.Adapter<TablesAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.text_table_name)
        val description: TextView = view.findViewById(R.id.text_table_description)
        val creator: TextView = view.findViewById(R.id.text_table_creator)
        val privacy: TextView = view.findViewById(R.id.text_table_privacy)
        val btnInvite: android.widget.Button = view.findViewById(R.id.btn_invite)
        val btnMore: android.widget.ImageButton = view.findViewById(R.id.btn_more)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_table, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val table = tables[position]
        holder.name.text = table.name
        holder.description.text = table.description

        // Privacy label
        if (table.isPrivate) {
            holder.privacy.visibility = View.VISIBLE
            holder.privacy.text = "Privativa"
        } else {
            holder.privacy.visibility = View.GONE
        }

        // Creator name (async fetch)
        GlobalScope.launch(Dispatchers.Main) {
            if (!table.masterId.isNullOrBlank()) {
                val user = com.galeria.defensores.data.UserRepository.getUser(table.masterId)
                holder.creator.text = "Criado por: ${user?.name ?: "Desconhecido"}"
            } else {
                holder.creator.text = "Criado por: Desconhecido"
            }
        }

        // Show invite / more only for the master of the table
        if (currentUserId == table.masterId) {
            holder.btnInvite.visibility = View.VISIBLE
            holder.btnInvite.setOnClickListener { onInviteClick(table) }

            holder.btnMore.visibility = View.VISIBLE
            holder.btnMore.setOnClickListener { view ->
                val popup = android.widget.PopupMenu(view.context, view)
                popup.menu.add("Editar")
                popup.menu.add("Excluir")
                popup.setOnMenuItemClickListener { item ->
                    when (item.title) {
                        "Editar" -> onEditClick(table)
                        "Excluir" -> onDeleteClick(table)
                    }
                    true
                }
                popup.show()
            }
        } else {
            holder.btnInvite.visibility = View.GONE
            holder.btnMore.visibility = View.GONE
        }

        holder.itemView.setOnClickListener { onTableClick(table) }
    }

    override fun getItemCount(): Int = tables.size
}
