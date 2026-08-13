/**
 * HyperNova Technology - Technical & Account Support Desk Engine
 */

class SupportDesk {
  async createTicket(applicantEmail, category, subject, description, priority = 'Medium', attachmentUrl = '') {
    const ticketId = 'ticket-' + Date.now();
    
    // Auto-detect target handler: Technical/Account -> IT Head; Application decision -> CEO
    let assignedHandler = 'it_head';
    if (category.toLowerCase().includes('application') || category.toLowerCase().includes('ceo') || category.toLowerCase().includes('rejection') || category.toLowerCase().includes('approval')) {
      assignedHandler = 'ceo';
    }

    const ticket = {
      id: ticketId,
      applicantEmail: applicantEmail,
      category: category,
      subject: subject,
      description: description,
      priority: priority,
      status: 'Open', // Open -> In Progress -> Resolved -> Closed
      attachmentUrl: attachmentUrl,
      assignedHandler: assignedHandler,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: []
    };

    await window.HyperNovaStore.setDoc('supportTickets', ticketId, ticket);
    await window.HyperNovaAudit.log('SUPPORT_TICKET_CREATED', applicantEmail, 'applicant', ticketId, { category, priority });

    // Send notifications to handler
    if (assignedHandler === 'it_head') {
      await window.HyperNovaNotify.sendEmailNotification(
        'it-head@hypernova.tech',
        'it_head',
        `New Technical Support Ticket: ${subject}`,
        `Ticket ID: ${ticketId}\nCategory: ${category}\nPriority: ${priority}\nDescription: ${description}`
      );
    } else {
      await window.HyperNovaNotify.sendEmailNotification(
        'ceo@hypernova.tech',
        'ceo',
        `New Application Inquiry Ticket: ${subject}`,
        `Ticket ID: ${ticketId}\nCategory: ${category}\nPriority: ${priority}`
      );
    }

    return ticket;
  }

  async updateTicketStatus(ticketId, newStatus, actorEmail, actorRole, note = '') {
    const ticket = await window.HyperNovaStore.getDoc('supportTickets', ticketId);
    if (!ticket) throw new Error("Ticket not found.");

    // Safeguard: IT Head cannot override CEO decision tickets
    if (actorRole === 'it_head' && ticket.category.toLowerCase().includes('ceo decision')) {
      throw new Error("Permission Denied: IT Head cannot modify CEO decision tickets.");
    }

    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();

    if (note) {
      if (!ticket.notes) ticket.notes = [];
      ticket.notes.push({
        author: actorEmail,
        role: actorRole,
        text: note,
        timestamp: new Date().toISOString()
      });
    }

    await window.HyperNovaStore.setDoc('supportTickets', ticketId, ticket);
    await window.HyperNovaAudit.log('SUPPORT_TICKET_UPDATED', actorEmail, actorRole, ticketId, { status: newStatus });

    // Notify applicant of status update
    await window.HyperNovaNotify.sendEmailNotification(
      ticket.applicantEmail,
      'applicant',
      `Support Ticket Update: [${newStatus}] ${ticket.subject}`,
      `Your support ticket (${ticket.id}) status has been updated to: ${newStatus}.${note ? ` Note: ${note}` : ''}`
    );

    return ticket;
  }

  async getTicketsForUser(email) {
    const list = await window.HyperNovaStore.getCollection('supportTickets');
    return list.filter(t => t.applicantEmail.toLowerCase() === email.toLowerCase())
               .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getAllTickets() {
    const list = await window.HyperNovaStore.getCollection('supportTickets');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

window.HyperNovaSupport = new SupportDesk();
