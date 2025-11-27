package com.galeria.defensores.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.galeria.defensores.R
import com.galeria.defensores.models.Table

class TablesAdapter(
    private val tables: List<Table>,
    private val currentUserId: String?,
    private val onTableClick: (Table) -> Unit,
    private val onInviteClick: (Table) -> Unit
) : RecyclerView.Adapter<TablesAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.text_table_name)
        val description: TextView = view.findViewById(R.id.text_table_description)
        val btnInvite: android.widget.Button = view.findViewById(R.id.btn_invite)
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
        
        if (currentUserId == table.masterId) {
            holder.btnInvite.visibility = View.VISIBLE
            holder.btnInvite.setOnClickListener { onInviteClick(table) }
        } else {
            holder.btnInvite.visibility = View.GONE
        }
        
        holder.itemView.setOnClickListener { onTableClick(table) }
    }

    override fun getItemCount() = tables.size
}
