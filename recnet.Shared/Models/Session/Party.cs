using System.Reflection.Metadata;

namespace recnet.Shared.Models;

/// <summary>
/// Prior to recommending any media, the party needs to set configurations
/// that points towards the type of media they'd like to see from swiped
/// options. This serves as a baseline media type to retrieve from the 
/// Netflix API. 
/// </summary>
public class Party
{
    public int Id { get; set; }
    public Guid PartyId { get; set; }
    public string? Name { get; set; }
    public List<User>? Users { get; set; }
    public int UserCount { get; set; }

    // Number of rounds the party can individually swipe on.
    public int RoundCount { get; set; }

    // The general media genres, users would like to see. Sends a baseline of at least half movie genres are these
    public List<Genre>? Genres { get; set; }

    // Movie or Tv Series
    public MediaType MediaType { get; set; }
}
